import { getPool } from '../config/db.js';

import {
  getCurrentDateInTimezone,
  getForecastTargetDates,
  validateReferenceDate,
  APP_TIMEZONE,
} from '../utils/dateUtils.js';

export async function findPredictionsByStationId(stationId, modelName = 'weighted_ensemble', allowedDates = null) {
  const pool = getPool();
  const params = [stationId, modelName];
  let dateFilter = '';

  if (Array.isArray(allowedDates) && allowedDates.length > 0) {
    params.push(allowedDates);
    dateFilter = `AND TO_CHAR(p.prediction_date, 'YYYY-MM-DD') = ANY($${params.length})`;
  }

  const sql = `
    SELECT
      p.id,
      p.station_id,
      p.target,
      TO_CHAR(p.prediction_date, 'YYYY-MM-DD') AS prediction_date,
      p.predicted_value::float AS predicted_value,
      p.lower_bound::float AS lower_bound,
      p.upper_bound::float AS upper_bound,
      p.model_name,
      p.model_version,
      p.features_used,
      p.metrics,
      p.generated_at
    FROM predictions p
    WHERE p.station_id = $1
      AND p.model_name = $2
      ${dateFilter}
    ORDER BY p.prediction_date ASC;
  `;
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function findPredictionSummary(modelName = 'weighted_ensemble') {
  const pool = getPool();
  const summarySql = `
    SELECT
      (SELECT count(*) FROM monitoring_stations WHERE is_active = TRUE)::int AS total_stations,
      count(DISTINCT p.station_id)::int AS stations_with_forecast,
      max(p.generated_at) AS last_generated_at,
      p.model_name,
      p.model_version,
      p.metrics
    FROM predictions p
    WHERE p.model_name = $1
    GROUP BY p.model_name, p.model_version, p.metrics
    LIMIT 1;
  `;
  const { rows } = await pool.query(summarySql, [modelName]);
  return rows[0] || null;
}


export async function findAllPredictions() {
  const pool = getPool();
  const sql = `
    SELECT
      p.id,
      p.station_id,
      s.station_code,
      s.name AS station_name,
      s.city,
      s.state,
      p.target,
      TO_CHAR(p.prediction_date, 'YYYY-MM-DD') AS prediction_date,
      p.predicted_value::float AS predicted_value,
      p.lower_bound::float AS lower_bound,
      p.upper_bound::float AS upper_bound,
      p.model_name,
      p.model_version,
      p.generated_at
    FROM predictions p
    JOIN monitoring_stations s ON s.id = p.station_id
    ORDER BY p.station_id, p.prediction_date ASC;
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

export async function findPredictionsByDate(dateStr, modelName = 'weighted_ensemble') {
  const pool = getPool();
  const sql = `
    SELECT
      s.id AS station_id,
      s.station_code,
      s.name AS station_name,
      s.city,
      s.state,
      s.latitude::float AS latitude,
      s.longitude::float AS longitude,
      p.id AS id,
      p.id AS prediction_id,
      TO_CHAR(p.prediction_date, 'YYYY-MM-DD') AS prediction_date,
      p.predicted_value::float AS pm25,
      p.lower_bound::float AS lower_bound,
      p.upper_bound::float AS upper_bound,
      p.model_name,
      p.model_version,
      p.generated_at,
      p.target,
      'predicted' AS data_type,
      (p.id IS NOT NULL) AS has_data
    FROM monitoring_stations s
    LEFT JOIN predictions p
      ON p.station_id = s.id
      AND p.prediction_date = $1
      AND p.target = 'pm25'
      AND p.model_name = $2
    WHERE s.is_active = TRUE
    ORDER BY s.state, s.city, s.name;
  `;
  const { rows } = await pool.query(sql, [dateStr, modelName]);
  return rows;
}

/**
 * Calculates a dynamic, timezone-safe 5-day forecasting horizon.
 * Capped so future reference dates are strictly rejected.
 * Target dates are strictly T+1 through T+5. Day 6+ is never returned.
 *
 * @param {string} [referenceDateParam] - 'YYYY-MM-DD'
 * @returns {Promise<object>} Horizon descriptor
 */
export async function getForecastHorizon(referenceDateParam) {
  const todayInKolkata = getCurrentDateInTimezone();
  let refDate;

  if (referenceDateParam) {
    refDate = validateReferenceDate(referenceDateParam);
  } else {
    // If not specified, default to today in Kolkata, or the latest available historical baseline
    refDate = todayInKolkata;
  }

  const allowedDates = getForecastTargetDates(refDate, 5);

  return {
    reference_date: refDate,
    horizon_days: 5,
    min_date: allowedDates[0],
    max_date: allowedDates[4],
    allowed_dates: allowedDates,
    forecast_dates: allowedDates,
    timezone: APP_TIMEZONE,
    current_app_date: todayInKolkata,
  };
}

export async function findModelsComparison() {
  const pool = getPool();
  const sql = `
    SELECT
      p.model_name,
      p.model_version,
      p.metrics,
      max(p.generated_at) AS generated_at,
      count(DISTINCT p.station_id)::int AS stations_with_forecast
    FROM predictions p
    GROUP BY p.model_name, p.model_version, p.metrics
    ORDER BY p.model_name ASC;
  `;
  const { rows } = await pool.query(sql);
  return rows;
}



