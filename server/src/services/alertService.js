import { getPool } from '../config/db.js';
import { getSeverity, CPCB_CATEGORIES, RULE_SOURCE } from '../utils/severityEngine.js';

// Supported threshold severity levels and their mapping
export const SEVERITY_LEVEL_MAP = {
  good: 1,
  satisfactory: 2,
  moderate: 3,
  poor: 4,
  very_poor: 5,
  severe: 6,
};

// Reverse map from level integer to canonical name
export const LEVEL_TO_NAME_MAP = {
  1: 'Good',
  2: 'Satisfactory',
  3: 'Moderate',
  4: 'Poor',
  5: 'Very Poor',
  6: 'Severe',
};

// 5-day future forecast window allowed dates
export const ALLOWED_FORECAST_DATES = [
  '2026-10-03',
  '2026-10-04',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
];

// Reference anchor date for live telemetry
export const LIVE_REFERENCE_DATE = '2026-10-02';

/**
 * Validates and normalizes threshold category string (e.g., 'Poor', 'poor', 'very_poor' -> level 4)
 * Returns the numeric severity level (1-6) or null if invalid.
 */
export function normalizeThreshold(rawCategory) {
  if (!rawCategory) return 4; // Default to Poor (level 4)
  if (typeof rawCategory === 'number') {
    if (rawCategory >= 1 && rawCategory <= 6) return Math.floor(rawCategory);
    return null;
  }
  const clean = String(rawCategory).toLowerCase().trim().replace(/[\s-]+/g, '_');
  return SEVERITY_LEVEL_MAP[clean] || null;
}

/**
 * In-memory cache for alerts to ensure idempotent, snappy responses.
 * Cache key: `${type}:${date}:${model}:${minLevel}`
 * TTL: 3 minutes.
 */
const alertCache = new Map();
const ALERT_CACHE_TTL_MS = 3 * 60 * 1000;

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of alertCache.entries()) {
    if (entry.expiresAt <= now) {
      alertCache.delete(key);
    }
  }
}

/**
 * Evaluates observed environmental alerts from real OpenAQ ground station telemetry.
 *
 * @param {object} opts
 * @param {string} [opts.date='2026-10-02'] - Query date (YYYY-MM-DD)
 * @param {string|number} [opts.minSeverity='poor'] - Minimum severity category (default: 'poor' -> level 4)
 * @param {boolean} [opts.isHistorical=false] - Whether query is in historical mode
 */
export async function getObservedAlerts({
  date = LIVE_REFERENCE_DATE,
  minSeverity = 'poor',
  isHistorical = false,
} = {}) {
  const minLevel = normalizeThreshold(minSeverity);
  if (minLevel === null) {
    const err = new Error(
      `Invalid severity threshold: '${minSeverity}'. Allowed categories: Good, Satisfactory, Moderate, Poor, Very Poor, Severe.`
    );
    err.statusCode = 400;
    throw err;
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const err = new Error(`Invalid date format: '${date}'. Expected YYYY-MM-DD.`);
    err.statusCode = 400;
    throw err;
  }

  cleanCache();
  const cacheKey = `observed:${date}:${minLevel}:${isHistorical}`;
  const cached = alertCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection pool unavailable.');
  }

  // Query actual observations for the specified date
  const sql = `
    SELECT
      s.id AS station_id,
      s.station_code,
      s.name AS station_name,
      s.city,
      s.state,
      s.latitude::float AS latitude,
      s.longitude::float AS longitude,
      s.is_dashboard_station,
      o.id AS observation_id,
      o.recorded_at,
      o.pm25,
      o.pm10,
      o.no2,
      o.so2,
      o.co,
      o.o3,
      o.source,
      o.ingested_at
    FROM environmental_observations o
    JOIN monitoring_stations s ON s.id = o.station_id
    WHERE (o.recorded_at AT TIME ZONE 'Asia/Kolkata')::date = $1
      AND s.is_active = TRUE
    ORDER BY s.state, s.city, s.name;
  `;

  const { rows } = await pool.query(sql, [date]);
  const alertEvaluationTime = new Date().toISOString();
  const evaluatedPollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
  const generatedAlerts = [];
  const seenEventKeys = new Set(); // Strict deduplication per event

  for (const row of rows) {
    for (const p of evaluatedPollutants) {
      const rawVal = row[p];
      if (rawVal === null || rawVal === undefined) continue;

      const sev = getSeverity(p, rawVal, false);

      // Only qualify if severity engine produces a valid category at or above threshold
      if (sev.status === 'valid' && sev.severity_level >= minLevel) {
        // Deterministic event key: type + station_id + pollutant + observation_id
        const eventKey = `obs:${row.station_id}:${p}:${row.observation_id || row.recorded_at}`;
        if (seenEventKeys.has(eventKey)) continue;
        seenEventKeys.add(eventKey);

        const categoryMeta = CPCB_CATEGORIES.find((c) => c.level === sev.severity_level);
        const ruleName = `Exceeds CPCB ${LEVEL_TO_NAME_MAP[minLevel]} Threshold (${sev.category} Tier ${sev.severity_level}/6)`;

        generatedAlerts.push({
          id: `alert-obs-${row.station_id}-${p}-${date}`,
          event_key: eventKey,
          alert_type: 'observed',
          status_label: isHistorical
            ? 'HISTORICAL OBSERVATION (INACTIVE EVENT)'
            : 'CURRENT GROUND MEASUREMENT (ACTIVE ALERT)',
          is_active: !isHistorical,
          is_historical: isHistorical,
          rule_triggered: ruleName,
          severity: {
            category: sev.category,
            level: sev.severity_level,
            max_level: 6,
            color: sev.color,
            bg_color: sev.bg_color,
            health_implication: sev.health_implication,
          },
          station: {
            id: row.station_id,
            code: row.station_code,
            name: row.station_name,
            city: row.city,
            state: row.state,
            latitude: row.latitude,
            longitude: row.longitude,
            is_dashboard_station: row.is_dashboard_station,
          },
          pollutant: {
            id: p,
            name: sev.metric_display,
            value: sev.value,
            unit: sev.unit,
            sub_index: sev.aqi_sub_index,
          },
          provenance: {
            source_type: 'openaq_ground_telemetry',
            provider: row.source || 'OpenAQ',
            recorded_at: row.recorded_at ? new Date(row.recorded_at).toISOString() : null,
            ingested_at: row.ingested_at ? new Date(row.ingested_at).toISOString() : null,
            evaluated_at: alertEvaluationTime,
          },
        });
      }
    }
  }

  // Sort alerts descending by severity level, then pollutant value
  generatedAlerts.sort((a, b) => {
    if (b.severity.level !== a.severity.level) {
      return b.severity.level - a.severity.level;
    }
    return (b.pollutant.value || 0) - (a.pollutant.value || 0);
  });

  const result = {
    status: 'success',
    alert_type: 'observed',
    date,
    is_historical: isHistorical,
    min_threshold: {
      category: LEVEL_TO_NAME_MAP[minLevel],
      level: minLevel,
      standard: RULE_SOURCE,
    },
    count: generatedAlerts.length,
    alerts: generatedAlerts,
    evaluated_at: alertEvaluationTime,
  };

  alertCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + ALERT_CACHE_TTL_MS,
  });

  return result;
}

/**
 * Evaluates forecast environmental alerts from AIRPULSE 5-day ML model predictions.
 *
 * @param {object} opts
 * @param {string} [opts.date='2026-10-03'] - Prediction target date (YYYY-MM-DD)
 * @param {string} [opts.model='weighted_ensemble'] - Prediction model
 * @param {string|number} [opts.minSeverity='poor'] - Minimum severity category
 */
export async function getForecastAlerts({
  date = '2026-10-03',
  model = 'weighted_ensemble',
  minSeverity = 'poor',
} = {}) {
  const minLevel = normalizeThreshold(minSeverity);
  if (minLevel === null) {
    const err = new Error(
      `Invalid severity threshold: '${minSeverity}'. Allowed categories: Good, Satisfactory, Moderate, Poor, Very Poor, Severe.`
    );
    err.statusCode = 400;
    throw err;
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const err = new Error(`Invalid date format: '${date}'. Expected YYYY-MM-DD.`);
    err.statusCode = 400;
    throw err;
  }

  // Strictly enforce 5-day forecast horizon restrictions
  if (!ALLOWED_FORECAST_DATES.includes(date)) {
    const err = new Error(
      `Forecast alerts are strictly restricted to the 5-day future horizon (${ALLOWED_FORECAST_DATES[0]} to ${ALLOWED_FORECAST_DATES[ALLOWED_FORECAST_DATES.length - 1]}). Date '${date}' is beyond the allowed horizon.`
    );
    err.statusCode = 400;
    throw err;
  }

  const validModels = ['weighted_ensemble', 'xgboost', 'random_forest', 'hist_gradient_boosting'];
  const effectiveModel = validModels.includes(model?.toLowerCase())
    ? model.toLowerCase()
    : 'weighted_ensemble';

  cleanCache();
  const cacheKey = `forecast:${date}:${effectiveModel}:${minLevel}`;
  const cached = alertCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection pool unavailable.');
  }

  const sql = `
    SELECT
      s.id AS station_id,
      s.station_code,
      s.name AS station_name,
      s.city,
      s.state,
      s.latitude::float AS latitude,
      s.longitude::float AS longitude,
      s.is_dashboard_station,
      p.id AS prediction_id,
      TO_CHAR(p.prediction_date, 'YYYY-MM-DD') AS prediction_date,
      p.predicted_value::float AS pm25,
      p.lower_bound::float AS lower_bound,
      p.upper_bound::float AS upper_bound,
      p.model_name,
      p.model_version,
      p.generated_at,
      p.target
    FROM predictions p
    JOIN monitoring_stations s ON s.id = p.station_id
    WHERE p.prediction_date = $1
      AND p.model_name = $2
      AND p.target = 'pm25'
      AND s.is_active = TRUE
    ORDER BY s.state, s.city, s.name;
  `;

  const { rows } = await pool.query(sql, [date, effectiveModel]);
  const alertEvaluationTime = new Date().toISOString();
  const generatedAlerts = [];
  const seenEventKeys = new Set();

  for (const row of rows) {
    if (row.pm25 === null || row.pm25 === undefined) continue;

    const sev = getSeverity('pm25', row.pm25, true, row.model_name);

    if (sev.status === 'valid' && sev.severity_level >= minLevel) {
      const eventKey = `fc:${row.station_id}:pm25:${date}:${effectiveModel}`;
      if (seenEventKeys.has(eventKey)) continue;
      seenEventKeys.add(eventKey);

      const ruleName = `Predicted to Exceed CPCB ${LEVEL_TO_NAME_MAP[minLevel]} Threshold (${sev.category} Tier ${sev.severity_level}/6)`;

      generatedAlerts.push({
        id: `alert-fc-${row.station_id}-pm25-${date}-${effectiveModel}`,
        event_key: eventKey,
        alert_type: 'predicted',
        status_label: 'PREDICTED / 5-DAY ML FORECAST (EARLY WARNING)',
        is_active: true,
        is_historical: false,
        rule_triggered: ruleName,
        severity: {
          category: sev.category,
          level: sev.severity_level,
          max_level: 6,
          color: sev.color,
          bg_color: sev.bg_color,
          health_implication: sev.health_implication,
        },
        station: {
          id: row.station_id,
          code: row.station_code,
          name: row.station_name,
          city: row.city,
          state: row.state,
          latitude: row.latitude,
          longitude: row.longitude,
          is_dashboard_station: row.is_dashboard_station,
        },
        pollutant: {
          id: 'pm25',
          name: 'PM2.5',
          value: sev.value,
          unit: sev.unit,
          lower_bound: row.lower_bound != null ? Number(row.lower_bound.toFixed(1)) : null,
          upper_bound: row.upper_bound != null ? Number(row.upper_bound.toFixed(1)) : null,
          sub_index: sev.aqi_sub_index,
        },
        provenance: {
          source_type: 'ml_forecast',
          provider: `AIRPULSE ML (${row.model_name})`,
          model_name: row.model_name,
          model_version: row.model_version,
          target_date: date,
          generated_at: row.generated_at ? new Date(row.generated_at).toISOString() : null,
          evaluated_at: alertEvaluationTime,
        },
      });
    }
  }

  generatedAlerts.sort((a, b) => {
    if (b.severity.level !== a.severity.level) {
      return b.severity.level - a.severity.level;
    }
    return (b.pollutant.value || 0) - (a.pollutant.value || 0);
  });

  const result = {
    status: 'success',
    alert_type: 'predicted',
    date,
    model_name: effectiveModel,
    min_threshold: {
      category: LEVEL_TO_NAME_MAP[minLevel],
      level: minLevel,
      standard: RULE_SOURCE,
    },
    count: generatedAlerts.length,
    alerts: generatedAlerts,
    evaluated_at: alertEvaluationTime,
  };

  alertCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + ALERT_CACHE_TTL_MS,
  });

  return result;
}

/**
 * Unified alert summary endpoint combining observed and forecast statistics.
 */
export async function getAlertSummary({
  observedDate = LIVE_REFERENCE_DATE,
  forecastDate = '2026-10-03',
  model = 'weighted_ensemble',
  minSeverity = 'poor',
  isHistorical = false,
} = {}) {
  const minLevel = normalizeThreshold(minSeverity) || 4;

  const [obsResult, fcResult] = await Promise.all([
    getObservedAlerts({ date: observedDate, minSeverity, isHistorical }),
    getForecastAlerts({ date: forecastDate, model, minSeverity }),
  ]);

  return {
    status: 'success',
    threshold: {
      category: LEVEL_TO_NAME_MAP[minLevel],
      level: minLevel,
      standard: RULE_SOURCE,
    },
    observed: {
      date: observedDate,
      is_historical: isHistorical,
      count: obsResult.count,
      high_severity_count: obsResult.alerts.filter((a) => a.severity.level >= 5).length,
    },
    forecast: {
      date: forecastDate,
      model: fcResult.model_name,
      count: fcResult.count,
      high_severity_count: fcResult.alerts.filter((a) => a.severity.level >= 5).length,
    },
    total_active_alerts: (isHistorical ? 0 : obsResult.count) + fcResult.count,
  };
}
