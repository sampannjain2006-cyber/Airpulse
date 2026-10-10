/**
 * AIRPULSE Precaution Recommendation Service
 * 
 * Rule-based contextual evaluation module coupling:
 * - Centralized Severity Engine (CPCB NAQI breakpoints)
 * - Authoritative public health guidance (WHO / CPCB)
 * - Data status tracking (Observed vs Modelled vs Forecast vs Historical)
 */

import { RECOMMENDATION_RULES, HEALTH_SOURCES } from '../config/recommendationRules.js';
import { getSeverity, CPCB_CATEGORIES } from '../utils/severityEngine.js';
import { getPool } from '../config/db.js';

const ALLOWED_FORECAST_DATES = [
  '2026-10-03',
  '2026-10-04',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
];

const STANDARD_DISCLAIMER =
  'AIRPULSE precaution recommendations are informational public health guidelines based on published CPCB NAQI and WHO environmental criteria. They do not constitute personalized medical diagnosis, clinical prescription, or a guarantee of individual protection.';

/**
 * Returns the static catalog of recommendation rules and health citations.
 */
export function getRecommendationRulesCatalog() {
  return {
    status: 'success',
    total_rules: RECOMMENDATION_RULES.length,
    sources: HEALTH_SOURCES,
    rules: RECOMMENDATION_RULES,
  };
}

/**
 * Generates context-aware precaution recommendations.
 */
export async function getRecommendations(params = {}) {
  const {
    station_id,
    pollutant: rawPollutant = 'pm25',
    value: rawValue,
    severity_tier: rawTier,
    mode = 'live',
    date,
    model = 'weighted_ensemble',
    data_type: rawDataType,
    target_audience,
  } = params;

  const pollutant = String(rawPollutant).toLowerCase().trim();

  // Validate mode
  const validModes = ['live', 'historical', 'forecast'];
  const effectiveMode = validModes.includes(mode) ? mode : 'live';

  // Enforce 5-Day forecast horizon
  if (effectiveMode === 'forecast' && date) {
    if (!ALLOWED_FORECAST_DATES.includes(date)) {
      const err = new Error(
        `Forecast horizon exceeded: Date '${date}' is outside the allowable 5-day predictive window (${ALLOWED_FORECAST_DATES[0]} to ${ALLOWED_FORECAST_DATES[ALLOWED_FORECAST_DATES.length - 1]}).`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  let stationMeta = null;
  let evalResult = null;
  let resolvedValue = rawValue !== undefined && rawValue !== null && rawValue !== '' ? parseFloat(rawValue) : null;
  let resolvedTimestamp = date || null;
  let provider = 'OpenAQ';
  let resolvedDataType = rawDataType || (effectiveMode === 'forecast' ? 'predicted' : 'observed');

  // If station_id is provided, fetch latest, snapshot, or forecast context from DB
  if (station_id) {
    const pool = getPool();
    if (pool) {
      const parsedStationId = parseInt(station_id, 10);
      if (!isNaN(parsedStationId)) {
        // Query station
        const stationRes = await pool.query(
          'SELECT id, station_code, name, city, state, latitude, longitude, is_active FROM monitoring_stations WHERE id = $1',
          [parsedStationId]
        );
        if (stationRes.rows.length > 0) {
          const st = stationRes.rows[0];
          stationMeta = {
            id: st.id,
            code: st.station_code,
            name: st.name,
            city: st.city,
            state: st.state,
            latitude: st.latitude,
            longitude: st.longitude,
            is_active: st.is_active,
          };

          // If numeric value wasn't explicitly supplied, retrieve from database
          if (resolvedValue === null) {
            if (effectiveMode === 'forecast') {
              const targetDate = date || ALLOWED_FORECAST_DATES[0];
              resolvedTimestamp = targetDate;
              provider = `AIRPULSE ML (${model})`;
              resolvedDataType = 'predicted';

              const predRes = await pool.query(
                `SELECT predicted_value, lower_bound, upper_bound, target, model_name, prediction_date 
                 FROM predictions 
                 WHERE station_id = $1 AND target = $2 AND model_name = $3 AND prediction_date = $4::date
                 LIMIT 1`,
                [parsedStationId, pollutant, model, targetDate]
              );
              if (predRes.rows.length > 0) {
                resolvedValue = parseFloat(predRes.rows[0].predicted_value);
              }
            } else if (effectiveMode === 'historical') {
              const histDate = date || '2026-10-02';
              resolvedTimestamp = histDate;
              resolvedDataType = 'observed';

              const histRes = await pool.query(
                `SELECT pm25, pm10, no2, so2, co, o3, recorded_at, source 
                 FROM environmental_observations 
                 WHERE station_id = $1 AND (recorded_at::date) = $2::date
                 ORDER BY recorded_at DESC LIMIT 1`,
                [parsedStationId, histDate]
              );
              if (histRes.rows.length > 0) {
                const row = histRes.rows[0];
                resolvedValue = row[pollutant] != null ? parseFloat(row[pollutant]) : null;
                resolvedTimestamp = row.recorded_at ? new Date(row.recorded_at).toISOString() : histDate;
                provider = row.source || 'OpenAQ';
              }
            } else {
              // Live mode: latest observation
              resolvedDataType = 'observed';
              const latestRes = await pool.query(
                `SELECT pm25, pm10, no2, so2, co, o3, recorded_at, source 
                 FROM environmental_observations 
                 WHERE station_id = $1 
                 ORDER BY recorded_at DESC LIMIT 1`,
                [parsedStationId]
              );
              if (latestRes.rows.length > 0) {
                const row = latestRes.rows[0];
                resolvedValue = row[pollutant] != null ? parseFloat(row[pollutant]) : null;
                resolvedTimestamp = row.recorded_at ? new Date(row.recorded_at).toISOString() : null;
                provider = row.source || 'OpenAQ';
              }
            }
          }
        }
      }
    }
  }

  // Determine Severity Evaluation using Centralized SeverityEngine
  let severityTier = null;
  let severityCategory = null;
  let severityColor = '#64748b';
  let severityBgColor = 'rgba(100, 116, 139, 0.15)';
  let healthImplication = '';

  if (resolvedValue !== null && !isNaN(resolvedValue)) {
    const isPred = effectiveMode === 'forecast' || resolvedDataType === 'predicted';
    evalResult = getSeverity(pollutant, resolvedValue, isPred, model);

    if (evalResult.status === 'unavailable') {
      return {
        status: 'unavailable',
        reason: evalResult.reason,
        context: {
          mode: effectiveMode,
          pollutant,
          value: resolvedValue,
          station: stationMeta,
          data_type: resolvedDataType,
        },
        count: 0,
        recommendations: [],
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    severityTier = evalResult.severity_level;
    severityCategory = evalResult.category;
    severityColor = evalResult.color;
    severityBgColor = evalResult.bg_color;
    healthImplication = evalResult.health_implication;
  } else if (rawTier !== undefined && rawTier !== null && rawTier !== '') {
    // Explicit tier provided
    const parsedTier = parseInt(rawTier, 10);
    if (!isNaN(parsedTier) && parsedTier >= 1 && parsedTier <= 6) {
      severityTier = parsedTier;
      const catMeta = CPCB_CATEGORIES.find((c) => c.level === parsedTier) || CPCB_CATEGORIES[0];
      severityCategory = catMeta.name;
      severityColor = catMeta.color;
      severityBgColor = catMeta.bgColor;
      healthImplication = catMeta.implication;
    }
  }

  // If no severity could be established, return honest unavailable state
  if (!severityTier) {
    return {
      status: 'unavailable',
      reason: 'Insufficient environmental telemetry: pollutant concentration or severity tier not provided or not recorded for this station.',
      context: {
        mode: effectiveMode,
        pollutant,
        value: resolvedValue,
        station: stationMeta,
        data_type: resolvedDataType,
      },
      count: 0,
      recommendations: [],
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  // Context flags
  const isHistorical = effectiveMode === 'historical';
  const isForecast = effectiveMode === 'forecast' || resolvedDataType === 'predicted';
  const isModelled = resolvedDataType === 'modelled';

  let contextLabel = 'CURRENT GROUND MEASUREMENT';
  if (isHistorical) contextLabel = 'HISTORICAL OBSERVATION (INACTIVE)';
  else if (isForecast) contextLabel = '5-DAY ML FORECAST (PREDICTED)';
  else if (isModelled) contextLabel = 'GOOGLE MODELLED / SPATIALLY INTERPOLATED';

  // Evaluate matching recommendation rules
  const matchingRecommendations = [];

  for (const rule of RECOMMENDATION_RULES) {
    // 1. Pollutant match
    const matchesPollutant =
      rule.applicable_pollutants.includes(pollutant) ||
      rule.applicable_pollutants.includes('general') ||
      rule.applicable_pollutants.includes('all');

    if (!matchesPollutant) continue;

    // 2. Severity tier range match
    if (severityTier < rule.min_severity_tier || severityTier > rule.max_severity_tier) {
      continue;
    }

    // 3. Mode/Forecast specific matching
    if (rule.id === 'rec-forecast-advance-preparation' && !isForecast) {
      continue; // Only include forecast advance preparation in forecast mode
    }

    // 4. Target audience filter (if user filtered by audience)
    if (target_audience && target_audience !== 'all') {
      if (rule.target_audience !== 'all' && rule.target_audience !== target_audience) {
        continue;
      }
    }

    // Contextualize recommendation card
    matchingRecommendations.push({
      id: `${rule.id}-${effectiveMode}-${pollutant}`,
      rule_id: rule.id,
      title: rule.title,
      explanation: rule.explanation,
      priority: rule.priority,
      target_audience: rule.target_audience,
      applicable_pollutant: pollutant.toUpperCase(),
      severity_tier: severityTier,
      severity_category: severityCategory,
      trigger_description: rule.trigger_description,
      rationale: rule.rationale,
      disclaimer: rule.disclaimer,
      source: rule.source,
      context: {
        mode: effectiveMode,
        context_label: contextLabel,
        is_historical: isHistorical,
        is_predicted: isForecast,
        is_modelled: isModelled,
        timestamp_or_date: resolvedTimestamp,
        provider,
        model_name: isForecast ? model : null,
      },
    });
  }

  // Sort by priority (1: Highest priority exposure reduction, followed by 2, 3, etc.)
  matchingRecommendations.sort((a, b) => a.priority - b.priority);

  return {
    status: 'success',
    context: {
      mode: effectiveMode,
      context_label: contextLabel,
      pollutant,
      pollutant_display: evalResult?.metric_display || pollutant.toUpperCase(),
      value: resolvedValue,
      unit: evalResult?.unit || (pollutant === 'co' ? 'mg/m³' : 'µg/m³'),
      sub_index: evalResult?.aqi_sub_index ?? null,
      severity: {
        level: severityTier,
        category: severityCategory,
        color: severityColor,
        bg_color: severityBgColor,
        health_implication: healthImplication,
      },
      station: stationMeta,
      date_or_timestamp: resolvedTimestamp,
      provider,
      data_type: resolvedDataType,
      model_name: isForecast ? model : null,
      is_historical: isHistorical,
      is_predicted: isForecast,
      is_modelled: isModelled,
    },
    count: matchingRecommendations.length,
    recommendations: matchingRecommendations,
    disclaimer: STANDARD_DISCLAIMER,
  };
}
