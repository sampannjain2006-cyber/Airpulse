import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  findPredictionsByStationId,
  findPredictionSummary,
  findAllPredictions,
  findPredictionsByDate,
  getForecastHorizon,
  findModelsComparison,
} from '../models/predictionModel.js';
import { findStationById } from '../models/stationModel.js';
import { getPool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUMMARY_JSON_PATH = path.resolve(__dirname, '../../../ml/app/models/forecast_summary.json');

function loadSummaryJson() {
  try {
    if (fs.existsSync(SUMMARY_JSON_PATH)) {
      const raw = fs.readFileSync(SUMMARY_JSON_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[PredictionService] Could not read forecast_summary.json:', err.message);
  }
  return null;
}

import {
  getCurrentDateInTimezone,
  validateReferenceDate,
  getForecastTargetDates,
  APP_TIMEZONE,
} from '../utils/dateUtils.js';

export async function getStationForecast(stationIdParam, modelName = 'weighted_ensemble', referenceDateParam = null) {
  const stationId = parseInt(stationIdParam, 10);
  if (isNaN(stationId)) {
    const err = new Error(`Invalid station_id: '${stationIdParam}'. Must be a numeric ID.`);
    err.statusCode = 400;
    throw err;
  }

  const station = await findStationById(stationId);
  if (!station) {
    const err = new Error(`Station not found: ${stationId}`);
    err.statusCode = 404;
    throw err;
  }

  // Get dynamic timezone-safe horizon for the reference date (validates future dates)
  const horizon = await getForecastHorizon(referenceDateParam);
  const refDate = horizon.reference_date;
  const allowedDates = horizon.allowed_dates;

  // Retrieve predictions for the selected model strictly matching the 5 horizon target dates
  const predictions = await findPredictionsByStationId(stationId, modelName, allowedDates);

  // Retrieve observation records strictly up to reference date (prevent future data leakage)
  const pool = getPool();
  const histCheckRes = await pool.query(
    `SELECT
       COUNT(DISTINCT DATE(recorded_at))::int AS hist_days,
       MAX(recorded_at) AS last_obs_time
     FROM environmental_observations
     WHERE station_id = $1
       AND pm25 IS NOT NULL
       AND recorded_at <= ($2::date + interval '1 day' - interval '1 millisecond');`,
    [stationId, refDate]
  );
  const histDays = histCheckRes.rows[0]?.hist_days || 0;

  // Retrieve latest observed PM2.5 measurement up to reference date
  const lastObsRes = await pool.query(
    `SELECT TO_CHAR(recorded_at, 'YYYY-MM-DD') AS obs_date, pm25::float
     FROM environmental_observations
     WHERE station_id = $1
       AND pm25 IS NOT NULL
       AND recorded_at <= ($2::date + interval '1 day' - interval '1 millisecond')
     ORDER BY recorded_at DESC
     LIMIT 1;`,
    [stationId, refDate]
  );
  const lastObs = lastObsRes.rows[0] || null;

  const summary = loadSummaryJson();
  const modelEval = summary?.models_evaluation?.[modelName] || null;
  const modelDisplayName = modelName === 'weighted_ensemble'
    ? 'Weighted Ensemble (XGB + RF + HGB)'
    : modelName === 'hist_gradient_boosting'
    ? 'HistGradientBoosting'
    : modelName === 'random_forest'
    ? 'Random Forest'
    : 'XGBoost';

  // If station has insufficient history (< 14 days) or no predictions available for horizon
  if (histDays < 14 || !predictions || predictions.length === 0) {
    return {
      station_id: station.id,
      station_code: station.station_code,
      station_name: station.name,
      city: station.city,
      state: station.state,
      target: 'PM2.5',
      unit: 'µg/m³',
      status: 'insufficient_data',
      model: modelName,
      model_display_name: modelDisplayName,
      model_version: '1.0.0',
      reference_date: refDate,
      forecast_horizon: horizon,
      last_observed: lastObs ? { date: lastObs.obs_date, value: lastObs.pm25 } : null,
      forecast: [],
      message: histDays < 14
        ? `Prediction unavailable — insufficient historical telemetry (${histDays} days < 14 days required) up to reference date ${refDate}.`
        : `Prediction unavailable — no valid forecast generated for reference date ${refDate}.`,
      source: 'OpenAQ historical observations',
      prediction_type: 'ML forecast',
    };
  }

  const first = predictions[0];
  // Ensure we only return up to 5 days, sorted chronologically
  const sortedForecast = predictions
    .filter((p) => allowedDates.includes(p.prediction_date))
    .slice(0, 5)
    .map((p, idx) => ({
      day: idx + 1,
      date: p.prediction_date,
      predicted_value: p.predicted_value,
      lower_bound: p.lower_bound,
      upper_bound: p.upper_bound,
    }));

  return {
    station_id: station.id,
    station_code: station.station_code,
    station_name: station.name,
    city: station.city,
    state: station.state,
    target: 'PM2.5',
    unit: 'µg/m³',
    status: 'available',
    model: first.model_name || modelName,
    model_display_name: modelDisplayName,
    model_version: first.model_version || '1.0.0',
    metrics: first.metrics || modelEval || null,
    generated_at: first.generated_at,
    reference_date: refDate,
    forecast_horizon: horizon,
    last_observed: lastObs ? { date: lastObs.obs_date, value: lastObs.pm25 } : null,
    forecast: sortedForecast,
    source: 'OpenAQ historical observations',
    prediction_type: 'ML forecast',
    explanation:
      modelName === 'weighted_ensemble'
        ? 'Forecast generated using a validation-weighted multi-model ensemble (XGBoost 32.8%, Random Forest 33.3%, HistGradientBoosting 34.0%) based on historical validation error minimization.'
        : `Forecast generated using a ${modelDisplayName} regression model trained on historical OpenAQ observations.`,
  };
}

export async function getPredictionsOverview(modelName = 'weighted_ensemble') {
  const summaryJson = loadSummaryJson();
  const summary = await findPredictionSummary(modelName);
  const pool = getPool();

  const totalStationsRes = await pool.query(
    'SELECT count(*)::int AS count FROM monitoring_stations WHERE is_active = TRUE;'
  );
  const totalStations = totalStationsRes.rows[0]?.count || 0;
  const stationsWithForecast = summary?.stations_with_forecast || summaryJson?.stations_with_forecast || 0;
  const stationsInsufficient = Math.max(0, totalStations - stationsWithForecast);

  const modelDisplayName = modelName === 'weighted_ensemble'
    ? 'Weighted Ensemble'
    : modelName === 'hist_gradient_boosting'
    ? 'HistGradientBoosting'
    : modelName === 'random_forest'
    ? 'Random Forest'
    : 'XGBoost';

  return {
    model: modelName,
    model_display_name: modelDisplayName,
    model_version: summary?.model_version || '1.0.0',
    target: 'PM2.5',
    unit: 'µg/m³',
    total_stations: totalStations,
    stations_with_forecast: stationsWithForecast,
    stations_insufficient_data: stationsInsufficient,
    last_generated_at: summary?.last_generated_at || summaryJson?.generated_at || null,
    metrics: summary?.metrics || summaryJson?.models_evaluation?.[modelName] || null,
    all_models_evaluation: summaryJson?.models_evaluation || null,
    ensemble_weights: summaryJson?.ensemble_weights || null,
    selection_rationale: summaryJson?.selection_rationale || null,
    source: 'OpenAQ historical observations',
    forecast_horizon_days: 5,
  };
}

export async function getModelsComparisonService() {
  const summaryJson = loadSummaryJson();
  const dbRows = await findModelsComparison();

  return {
    primary_model: summaryJson?.primary_model || 'weighted_ensemble',
    selection_rationale: summaryJson?.selection_rationale || 'Validation performance comparison across chronological test set.',
    target: 'PM2.5',
    unit: 'µg/m³',
    ensemble_weights: summaryJson?.ensemble_weights || null,
    models: summaryJson?.models_evaluation || dbRows,
  };
}

export async function listAllPredictions() {
  const rows = await findAllPredictions();
  return {
    count: rows.length,
    data: rows,
  };
}

/**
 * Snapshot of predictions across all active stations for a future forecast date.
 * Strictly validates that the requested date is within the 5-day horizon [T+1, T+5].
 * Rejects Day 6+ or dates outside the valid horizon.
 */
export async function getPredictionsSnapshot(dateStr, modelName = 'weighted_ensemble', referenceDateParam = null) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const err = new Error("Invalid or missing date parameter. Must be in 'YYYY-MM-DD' format.");
    err.statusCode = 400;
    throw err;
  }

  const horizon = await getForecastHorizon(referenceDateParam);
  const allowed = horizon.allowed_dates;

  if (!allowed.includes(dateStr)) {
    const err = new Error(
      `Date '${dateStr}' is outside the valid 5-day forecasting horizon. Allowed forecast dates: ${allowed.join(', ')} (Day 1 through Day 5 from reference date ${horizon.reference_date}).`
    );
    err.statusCode = 400;
    throw err;
  }

  const rows = await findPredictionsByDate(dateStr, modelName);
  const stationsWithForecast = rows.filter((r) => r.has_data).length;

  const dayIndex = allowed.indexOf(dateStr) + 1;
  const modelDisplayName = modelName === 'weighted_ensemble'
    ? 'Weighted Ensemble'
    : modelName === 'hist_gradient_boosting'
    ? 'HistGradientBoosting'
    : modelName === 'random_forest'
    ? 'Random Forest'
    : 'XGBoost';

  return {
    date: dateStr,
    forecast_day: dayIndex,
    data_type: 'predicted',
    model: modelName,
    model_display_name: modelDisplayName,
    target: 'PM2.5',
    unit: 'µg/m³',
    source: 'OpenAQ historical observations + Multi-Model ML Forecasting',
    total_stations: rows.length,
    stations_with_forecast: stationsWithForecast,
    stations_insufficient_data: rows.length - stationsWithForecast,
    forecast_horizon: horizon,
    data: rows,
  };
}

export async function getHorizon(referenceDateParam = null) {
  return await getForecastHorizon(referenceDateParam);
}


