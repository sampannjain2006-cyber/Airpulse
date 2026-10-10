import { findObservedHotspots, findForecastHotspots } from '../models/hotspotModel.js';
import { getSeverity } from '../utils/severityEngine.js';

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

// Allowed 5-day future forecast window
const ALLOWED_FORECAST_DATES = [
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
 * @param {string} [params.date='2026-10-02'] - Date (YYYY-MM-DD)
 * @param {string} [params.mode='observed'] - 'live' | 'observed' | 'historical' | 'forecast'
 * @param {string} [params.model='weighted_ensemble'] - Prediction model if forecast mode
 * @param {number} [params.threshold=60.0] - Minimum PM2.5 threshold (µg/m³)
 * @param {number} [params.eps=40000] - DBSCAN epsilon cluster radius in meters
 * @param {number} [params.minStations=2] - Minimum distinct stations required
 */
export async function getHotspots({
  date = '2026-10-02',
  mode = 'observed',
  model = 'weighted_ensemble',
  threshold = 60.0,
  eps = 40000,
  minStations = 2,
} = {}) {
  const normalizedMode = (mode === 'live' || mode === 'historical') ? 'observed' : mode.toLowerCase();

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const err = new Error(`Invalid date format: '${date}'. Expected YYYY-MM-DD.`);
    err.statusCode = 400;
    throw err;
  }

  // Enforce 5-Day forecast horizon restriction on backend
  if (normalizedMode === 'forecast') {
    if (!ALLOWED_FORECAST_DATES.includes(date)) {
      const err = new Error(
        `Forecast hotspots are strictly restricted to the 5-day future horizon (Day 1 to Day 5: ${ALLOWED_FORECAST_DATES[0]} to ${ALLOWED_FORECAST_DATES[ALLOWED_FORECAST_DATES.length - 1]}). Date '${date}' is beyond the allowed horizon.`
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
  const cacheKey = `${normalizedMode}:${date}:${model}:${thresh}:${epsMeters}:${minPts}`;
  const cached = hotspotCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, cached: true };
  }

  let rawClusters = [];
  if (normalizedMode === 'forecast') {
    rawClusters = await findForecastHotspots({
      dateStr: date,
      modelName: model,
      threshold: thresh,
      epsMeters,
      minStations: minPts,
    });
  } else {
    rawClusters = await findObservedHotspots({
      dateStr: date,
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
      id: `hotspot-${normalizedMode}-${date}-${c.cluster_id ?? idx}`,
      cluster_id: c.cluster_id,
      title,
      date,
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
        : 'OpenAQ Ground Stations Telemetry',
      contributing_stations: c.stations,
      created_at: new Date().toISOString(),
    };
  });

  const response = {
    status: 'success',
    mode: normalizedMode,
    date,
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
    message: processedHotspots.length === 0
      ? 'No qualifying pollution hotspots detected for the selected date.'
      : undefined,
  };

  hotspotCache.set(cacheKey, {
    data: response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return response;
}
