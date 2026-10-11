import { findObservedHotspots, findForecastHotspots } from '../models/hotspotModel.js';
import { getSeverity } from '../utils/severityEngine.js';
import { getPool } from '../config/db.js';

// 5-minute in-memory cache for computed hotspot results
const hotspotCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of hotspotCache.entries()) {
    if (entry.expiresAt <= now) {
      hotspotCache.delete(key);
    }
  }
}

/**
 * Derive an intuitive regional title for the detected cluster based on constituent cities.
 */
function deriveClusterTitle(stations) {
  if (!stations || stations.length === 0) return 'Regional Hotspot';

  const cities = stations.map((s) => s.city).filter(Boolean);
  const cityCounts = {};
  for (const c of cities) {
    cityCounts[c] = (cityCounts[c] || 0) + 1;
  }

  const uniqueCities = Object.keys(cityCounts);

  // Check for Delhi-NCR metropolitan region
  const ncrKeywords = ['delhi', 'new delhi', 'gurugram', 'noida', 'ghaziabad', 'faridabad'];
  const hasNcr = uniqueCities.some((c) => ncrKeywords.includes(c.toLowerCase()));
  if (hasNcr) {
    return 'Delhi-NCR Regional Hotspot';
  }

  // If dominant single city
  const sortedCities = uniqueCities.sort((a, b) => cityCounts[b] - cityCounts[a]);
  const primaryCity = sortedCities[0];

  if (uniqueCities.length === 1) {
    return `${primaryCity} Metropolitan Hotspot`;
  }

  return `${primaryCity} & Neighboring Area Hotspot`;
}

// Fallback 5-day future forecast window
const DEFAULT_FORECAST_DATES = [
  '2026-10-03',
  '2026-10-04',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
];

/**
 * Retrieve geospatial pollution hotspots.
 *
 * @param {object} params
 * @param {string} [params.date] - Date (YYYY-MM-DD)
 * @param {string} [params.mode='observed'] - 'live' | 'observed' | 'historical' | 'forecast'
 * @param {string} [params.model='weighted_ensemble'] - Prediction model if forecast mode
 * @param {number} [params.threshold=60.0] - Minimum PM2.5 threshold (µg/m³)
 * @param {number} [params.eps=40000] - DBSCAN epsilon cluster radius in meters
 * @param {number} [params.minStations=2] - Minimum distinct stations required
 */
export async function getHotspots({
  date,
  mode = 'observed',
  model = 'weighted_ensemble',
  threshold = 60.0,
  eps = 40000,
  minStations = 2,
} = {}) {
  const normalizedMode = (mode === 'live' || mode === 'historical') ? 'observed' : mode.toLowerCase();
  const pool = getPool();

  let targetDate = date ? String(date).trim() : null;
  let latestObsDate = null;

  // Retrieve latest ground observation date from database if available
  if (pool) {
    try {
      const { rows: latestRow } = await pool.query(
        "SELECT MAX(CAST(recorded_at AT TIME ZONE 'Asia/Kolkata' AS date))::text as latest_date FROM environmental_observations WHERE pm25 IS NOT NULL"
      );
      if (latestRow.length > 0 && latestRow[0].latest_date) {
        latestObsDate = latestRow[0].latest_date;
      }
    } catch (e) {
      console.warn('[Hotspots] Failed to query latest observation date:', e.message);
    }
  }

  // If in live mode or no date provided, default to the latest available ground observation date
  if (normalizedMode === 'observed' && (mode === 'live' || !targetDate)) {
    targetDate = latestObsDate || '2026-10-07';
  }

  // Handle forecast mode dates
  let allowedForecastDates = [...DEFAULT_FORECAST_DATES];
  if (normalizedMode === 'forecast' && pool) {
    try {
      const { rows: predDates } = await pool.query(
        'SELECT DISTINCT CAST(prediction_date AS date)::text as pd FROM predictions ORDER BY 1 ASC'
      );
      if (predDates.length > 0) {
        allowedForecastDates = predDates.map((r) => r.pd);
      }
    } catch (e) {
      console.warn('[Hotspots] Failed to query prediction dates:', e.message);
    }

    if (!targetDate && allowedForecastDates.length > 0) {
      targetDate = allowedForecastDates[0];
    }
  }

  if (!targetDate) {
    targetDate = '2026-10-07';
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    const err = new Error(`Invalid date format: '${targetDate}'. Expected YYYY-MM-DD.`);
    err.statusCode = 400;
    throw err;
  }

  // Enforce forecast date validity
  if (normalizedMode === 'forecast') {
    if (!allowedForecastDates.includes(targetDate)) {
      const minDate = allowedForecastDates[0];
      const maxDate = allowedForecastDates[allowedForecastDates.length - 1];
      const err = new Error(
        `Forecast hotspots are available for dates with valid ML predictions (${minDate} to ${maxDate}). Date '${targetDate}' is outside the available horizon.`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  const thresh = Math.max(parseFloat(threshold) || 60.0, 10.0);
  const epsMeters = Math.min(Math.max(parseInt(eps, 10) || 40000, 5000), 200000);
  const minPts = Math.min(Math.max(parseInt(minStations, 10) || 2, 2), 20);

  // Check cache
  cleanCache();
  const cacheKey = `${normalizedMode}:${targetDate}:${model}:${thresh}:${epsMeters}:${minPts}`;
  const cached = hotspotCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, cached: true };
  }

  let totalObservationsOnDate = 0;
  if (pool && normalizedMode !== 'forecast') {
    try {
      const { rows: countRows } = await pool.query(
        "SELECT COUNT(*)::int as cnt FROM environmental_observations WHERE CAST(recorded_at AT TIME ZONE 'Asia/Kolkata' AS date) = $1 AND pm25 IS NOT NULL",
        [targetDate]
      );
      totalObservationsOnDate = countRows[0]?.cnt || 0;
    } catch (e) {
      console.warn('[Hotspots] Failed to count observations on date:', e.message);
    }
  }

  let rawClusters = [];
  if (normalizedMode === 'forecast') {
    rawClusters = await findForecastHotspots({
      dateStr: targetDate,
      modelName: model,
      threshold: thresh,
      epsMeters,
      minStations: minPts,
    });
  } else {
    rawClusters = await findObservedHotspots({
      dateStr: targetDate,
      threshold: thresh,
      epsMeters,
      minStations: minPts,
    });
  }

  const isForecast = normalizedMode === 'forecast';

  const processedHotspots = rawClusters.map((c, idx) => {
    const title = deriveClusterTitle(c.stations);
    const avgSeverity = getSeverity('pm25', c.avg_pm25, isForecast, isForecast ? model : null);
    const maxSeverity = getSeverity('pm25', c.max_pm25, isForecast, isForecast ? model : null);

    // Explainable Hotspot Density-Intensity Index: HDII = avg_pm25 * log2(1 + station_count)
    const hdii = Number((c.avg_pm25 * Math.log2(1 + c.station_count)).toFixed(1));

    let hullGeoJson = null;
    if (c.hull_geojson) {
      try {
        hullGeoJson = typeof c.hull_geojson === 'string' ? JSON.parse(c.hull_geojson) : c.hull_geojson;
      } catch {}
    }

    // Minimum display radius on Leaflet map: at least 10km for visual clarity
    const visualRadius = Math.max(c.radius_meters || 0, 10000);

    return {
      id: `hotspot-${normalizedMode}-${targetDate}-${c.cluster_id ?? idx}`,
      cluster_id: c.cluster_id,
      title,
      date: targetDate,
      mode: normalizedMode,
      data_type: isForecast ? 'predicted' : 'observed',
      data_type_label: isForecast
        ? 'PREDICTED HOTSPOT / ML FORECAST'
        : 'OBSERVED HOTSPOT / GROUND MEASURED',
      pollutant: 'pm25',
      pollutant_unit: 'µg/m³',
      center: {
        latitude: c.center_lat,
        longitude: c.center_lon,
      },
      radius_meters: visualRadius,
      actual_cluster_radius_meters: c.radius_meters,
      bounding_geojson: hullGeoJson,
      station_count: c.station_count,
      avg_pm25: c.avg_pm25,
      max_pm25: c.max_pm25,
      min_pm25: c.min_pm25,
      severity: avgSeverity,
      max_severity: maxSeverity,
      scoring: {
        metric: 'Hotspot Density-Intensity Index (HDII)',
        formula: 'HDII = avg_pm25 * log2(1 + station_count)',
        value: hdii,
        components: {
          avg_pm25: c.avg_pm25,
          station_count: c.station_count,
          log2_multiplier: Number(Math.log2(1 + c.station_count).toFixed(3)),
        },
      },
      model_name: isForecast ? model : null,
      source: isForecast
        ? `AIRPULSE ML Forecast (${model})`
        : 'OpenAQ Ground Stations Observations',
      contributing_stations: c.stations,
      created_at: new Date().toISOString(),
    };
  });

  let message;
  if (processedHotspots.length === 0) {
    if (normalizedMode === 'forecast') {
      message = `No qualifying pollution hotspot clusters detected for forecast date ${targetDate} using model '${model}' (threshold: ≥ ${thresh} µg/m³ PM2.5, radius: ${epsMeters / 1000} km, min stations: ${minPts}).`;
    } else if (totalObservationsOnDate === 0) {
      message = `No ground observations recorded in the database for ${targetDate}. Latest available observations are from ${latestObsDate || 'N/A'}.`;
    } else {
      message = `No qualifying pollution hotspot clusters found on ${targetDate}. None of the ${totalObservationsOnDate} reporting stations met the clustering criteria (threshold: ≥ ${thresh} µg/m³ PM2.5 within ${epsMeters / 1000} km with ≥ ${minPts} stations).`;
    }
  }

  const response = {
    status: 'success',
    mode: normalizedMode,
    date: targetDate,
    effective_date: targetDate,
    latest_available_date: latestObsDate,
    total_reporting_stations: totalObservationsOnDate,
    pollutant: 'pm25',
    pollutant_unit: 'µg/m³',
    config: {
      threshold_pm25: thresh,
      eps_meters: epsMeters,
      eps_km: epsMeters / 1000,
      min_stations: minPts,
      clustering_method: 'PostGIS ST_ClusterDBSCAN in EPSG:3857 metric projection',
      model_name: isForecast ? model : null,
      severity_standard: 'CPCB NAQI Standard (2014) Breakpoints',
    },
    hotspots_count: processedHotspots.length,
    hotspots: processedHotspots,
    message,
  };

  hotspotCache.set(cacheKey, {
    data: response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return response;
}
