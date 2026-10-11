import {
  findLatestObservations,
  findObservations,
  findObservationHistory,
  findObservationsByDate,
  getObservationsDateRange,
} from '../models/observationModel.js';
import { findStationById } from '../models/stationModel.js';

/**
 * Parse and validate a positive integer query param.
 * Returns the default if absent; throws 400 if invalid.
 */
function parseLimit(raw, defaultVal, max) {
  if (raw === undefined || raw === null || raw === '') return defaultVal;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1) {
    const err = new Error(`Invalid limit value: '${raw}'. Must be a positive integer.`);
    err.statusCode = 400;
    throw err;
  }
  return Math.min(n, max);
}

/**
 * Parse and validate an ISO8601 date string.
 * Returns undefined if absent; throws 400 if unparseable.
 */
function parseDate(raw, name) {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    const err = new Error(`Invalid date for '${name}': '${raw}'. Use ISO 8601 format.`);
    err.statusCode = 400;
    throw err;
  }
  return d.toISOString();
}

/**
 * Latest observation per station.
 */
export async function getLatestObservations({ city, limit: rawLimit } = {}) {
  const limit = parseLimit(rawLimit, 50, 200);
  const rows = await findLatestObservations({ city, limit });
  return {
    count: rows.length,
    data: rows,
  };
}

/**
 * Paginated observation list.
 */
export async function getObservations({ stationId: rawStation, from: rawFrom, to: rawTo, limit: rawLimit } = {}) {
  const limit = parseLimit(rawLimit, 100, 500);
  const from  = parseDate(rawFrom, 'from');
  const to    = parseDate(rawTo, 'to');

  let stationId;
  if (rawStation) {
    const n = parseInt(rawStation, 10);
    if (isNaN(n)) {
      const err = new Error(`Invalid station_id: '${rawStation}'. Must be a numeric ID.`);
      err.statusCode = 400;
      throw err;
    }
    stationId = n;
  }

  const rows = await findObservations({ stationId, from, to, limit });
  return {
    count: rows.length,
    filters: { stationId, from, to, limit },
    data: rows,
  };
}

/**
 * Historical observations for a single station (chart data).
 */
export async function getObservationHistory({ stationId: rawStation, from: rawFrom, to: rawTo, limit: rawLimit } = {}) {
  if (!rawStation) {
    const err = new Error('station_id query parameter is required for history.');
    err.statusCode = 400;
    throw err;
  }

  const stationId = parseInt(rawStation, 10);
  if (isNaN(stationId)) {
    const err = new Error(`Invalid station_id: '${rawStation}'. Must be a numeric ID.`);
    err.statusCode = 400;
    throw err;
  }

  // Verify station exists
  const station = await findStationById(stationId);
  if (!station) {
    const err = new Error(`Station not found: ${stationId}`);
    err.statusCode = 404;
    throw err;
  }

  const limit = parseLimit(rawLimit, 168, 1000); // default ~1 week hourly
  const from  = parseDate(rawFrom, 'from');
  const to    = parseDate(rawTo, 'to');

  const rows = await findObservationHistory({ stationId, from, to, limit });
  return {
    station,
    count: rows.length,
    data: rows,
  };
}

/**
 * Snapshot of observations across all active stations on a specific date.
 */
export async function getObservationsSnapshot(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const err = new Error("Invalid or missing date parameter. Must be in 'YYYY-MM-DD' format.");
    err.statusCode = 400;
    throw err;
  }

  const selectedDate = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(selectedDate.getTime())) {
    const err = new Error(`Invalid calendar date: '${dateStr}'.`);
    err.statusCode = 400;
    throw err;
  }

  const range = await getObservationsDateRange();
  if (range?.max_date && dateStr > range.max_date) {
    const err = new Error(`Date '${dateStr}' is beyond available historical observations (latest: ${range.max_date}). For future dates, use the 5-day forecast.`);
    err.statusCode = 400;
    throw err;
  }

  const rows = await findObservationsByDate(dateStr);
  const stationsWithData = rows.filter((r) => r.has_data).length;

  return {
    date: dateStr,
    data_type: 'observed',
    source: 'OpenAQ historical observations',
    total_stations: rows.length,
    stations_with_data: stationsWithData,
    stations_missing_data: rows.length - stationsWithData,
    date_range: range,
    data: rows,
  };
}

import { fetchAirQuality, isGoogleConfigured } from './googleService.js';
import { env } from '../config/env.js';
import { getPool } from '../config/db.js';

export async function getDateRange() {
  return await getObservationsDateRange();
}

/**
 * OpenAQ-first current-date monitoring with Google Air Quality fallback.
 *
 * 1. Checks latest OpenAQ ground observation for station.
 * 2. If fresh (<= freshnessHours, default 24h) and contains measurements, returns OpenAQ observed data.
 * 3. If missing or stale (>24h), attempts Google Air Quality API current conditions when configured.
 * 4. Google data is strictly labelled data_type: 'modelled'.
 * 5. If Google is unconfigured/disabled/fails, returns honest stale or unavailable state.
 * 6. Never invents measurements or sets missing pollutants to 0.
 *
 * @param {number|string} stationIdParam
 * @param {object} [options]
 * @param {boolean} [options.disableGoogle=false]
 * @param {number} [options.freshnessHours=24]
 */
export async function getStationCurrentCondition(stationIdParam, { disableGoogle = false, freshnessHours = 24 } = {}) {
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

  const pool = getPool();
  const obsRes = await pool.query(
    `SELECT
       o.id, o.station_id, o.recorded_at, o.aqi, o.aqi_category,
       o.pm25, o.pm10, o.no2, o.so2, o.co, o.o3,
       o.temperature, o.humidity, o.pressure,
       o.source, o.ingested_at
     FROM environmental_observations o
     WHERE o.station_id = $1
     ORDER BY o.recorded_at DESC
     LIMIT 1;`,
    [stationId]
  );
  const obs = obsRes.rows[0] || null;

  let ageHours = null;
  let isFresh = false;
  const threshold = Number(freshnessHours) || 24;

  if (obs?.recorded_at) {
    const recTime = new Date(obs.recorded_at).getTime();
    if (!isNaN(recTime)) {
      ageHours = (Date.now() - recTime) / (1000 * 60 * 60);
      isFresh = ageHours <= threshold;
    }
  }

  const hasReadings = obs && (obs.pm25 !== null || obs.aqi !== null || obs.pm10 !== null || obs.no2 !== null);

  // 1. Prefer fresh OpenAQ ground observation
  if (obs && hasReadings && isFresh) {
    return {
      station_id: station.id,
      station_code: station.station_code,
      station_name: station.name,
      city: station.city,
      state: station.state,
      latitude: station.latitude,
      longitude: station.longitude,
      data_type: 'observed',
      provenance: {
        data_type: 'observed',
        source: 'OpenAQ ground observation',
        provider: 'OpenAQ v3 Ground Station Network',
        is_modelled: false,
      },
      source: 'OpenAQ ground observation',
      provider: 'OpenAQ v3 Ground Station Network',
      recorded_at: obs.recorded_at,
      age_hours: ageHours ? Math.round(ageHours * 10) / 10 : null,
      is_fresh: true,
      aqi: obs.aqi != null ? parseFloat(obs.aqi) : null,
      aqi_category: obs.aqi_category,
      pm25: obs.pm25 != null ? parseFloat(obs.pm25) : null,
      pm10: obs.pm10 != null ? parseFloat(obs.pm10) : null,
      no2: obs.no2 != null ? parseFloat(obs.no2) : null,
      so2: obs.so2 != null ? parseFloat(obs.so2) : null,
      co: obs.co != null ? parseFloat(obs.co) : null,
      o3: obs.o3 != null ? parseFloat(obs.o3) : null,
      temperature: obs.temperature != null ? parseFloat(obs.temperature) : null,
      humidity: obs.humidity != null ? parseFloat(obs.humidity) : null,
      pressure: obs.pressure != null ? parseFloat(obs.pressure) : null,
      fallback_applied: false,
      status: 'success',
    };
  }

  // 2. OpenAQ is missing or stale: Attempt Google Air Quality current conditions fallback
  const shouldAttemptGoogle =
    !disableGoogle &&
    disableGoogle !== 'true' &&
    !env.DISABLE_GOOGLE_FALLBACK &&
    isGoogleConfigured() &&
    station.latitude != null &&
    station.longitude != null;

  if (shouldAttemptGoogle) {
    try {
      const googleRes = await fetchAirQuality(station.latitude, station.longitude);
      if (googleRes && googleRes.available && googleRes.status === 'success') {
        return {
          station_id: station.id,
          station_code: station.station_code,
          station_name: station.name,
          city: station.city,
          state: station.state,
          latitude: station.latitude,
          longitude: station.longitude,
          data_type: 'modelled',
          provenance: {
            data_type: 'modelled',
            source: 'Google Air Quality API',
            provider: 'Google Air Quality Modelled Interpolation',
            is_modelled: true,
          },
          source: 'Google Air Quality API',
          provider: 'Google Air Quality Modelled Interpolation',
          data_type_label: 'Google Modelled / Spatial Interpolation',
          recorded_at: googleRes.date_time,
          age_hours: 0,
          is_fresh: true,
          fallback_applied: true,
          fallback_reason: obs
            ? `OpenAQ observation is stale (${ageHours ? ageHours.toFixed(1) : '?'}h old > ${threshold}h threshold).`
            : 'No OpenAQ ground observation recorded for this station.',
          openaq_stale_observation: obs
            ? {
                recorded_at: obs.recorded_at,
                age_hours: ageHours ? Math.round(ageHours * 10) / 10 : null,
                pm25: obs.pm25 != null ? parseFloat(obs.pm25) : null,
                aqi: obs.aqi != null ? parseFloat(obs.aqi) : null,
              }
            : null,
          universal_aqi: googleRes.universal_aqi,
          local_aqi: googleRes.local_aqi,
          aqi: googleRes.local_aqi?.aqi ?? googleRes.universal_aqi?.aqi ?? null,
          aqi_category: googleRes.local_aqi?.category ?? googleRes.universal_aqi?.category ?? null,
          pm25: googleRes.pm25,
          pm10: googleRes.pm10,
          no2: googleRes.no2,
          so2: googleRes.so2,
          co: googleRes.co,
          o3: googleRes.o3,
          temperature: null,
          humidity: null,
          pressure: null,
          pollutants: googleRes.pollutants,
          health_recommendations: googleRes.health_recommendations,
          cached: Boolean(googleRes.cached),
          status: 'success',
        };
      }
    } catch (gErr) {
      console.warn(`[ObservationService] Google fallback error for station ${stationId}:`, gErr.message);
    }
  }

  // 3. Stale OpenAQ data fallback (honest label)
  if (obs && hasReadings) {
    return {
      station_id: station.id,
      station_code: station.station_code,
      station_name: station.name,
      city: station.city,
      state: station.state,
      latitude: station.latitude,
      longitude: station.longitude,
      data_type: 'observed',
      provenance: {
        data_type: 'observed',
        source: 'OpenAQ (stale)',
        provider: 'OpenAQ v3 Ground Station Network',
        is_modelled: false,
      },
      source: 'OpenAQ (stale)',
      provider: 'OpenAQ v3 Ground Station Network',
      recorded_at: obs.recorded_at,
      age_hours: ageHours ? Math.round(ageHours * 10) / 10 : null,
      is_fresh: false,
      fallback_applied: false,
      warning: `Telemetry is stale (${ageHours ? ageHours.toFixed(1) : '?'}h old > ${threshold}h threshold). Google Air Quality fallback was not applied (${!isGoogleConfigured() ? 'GOOGLE_MAPS_API_KEY unconfigured' : disableGoogle ? 'disabled by query parameter' : 'service unavailable'}).`,
      aqi: obs.aqi != null ? parseFloat(obs.aqi) : null,
      aqi_category: obs.aqi_category,
      pm25: obs.pm25 != null ? parseFloat(obs.pm25) : null,
      pm10: obs.pm10 != null ? parseFloat(obs.pm10) : null,
      no2: obs.no2 != null ? parseFloat(obs.no2) : null,
      so2: obs.so2 != null ? parseFloat(obs.so2) : null,
      co: obs.co != null ? parseFloat(obs.co) : null,
      o3: obs.o3 != null ? parseFloat(obs.o3) : null,
      temperature: obs.temperature != null ? parseFloat(obs.temperature) : null,
      humidity: obs.humidity != null ? parseFloat(obs.humidity) : null,
      pressure: obs.pressure != null ? parseFloat(obs.pressure) : null,
      status: 'stale',
    };
  }

  // 4. Honest missing/unavailable state
  return {
    station_id: station.id,
    station_code: station.station_code,
    station_name: station.name,
    city: station.city,
    state: station.state,
    latitude: station.latitude,
    longitude: station.longitude,
    data_type: 'unavailable',
    provenance: {
      data_type: 'unavailable',
      source: null,
      provider: null,
      is_modelled: false,
    },
    source: null,
    is_fresh: false,
    fallback_applied: false,
    status: 'unavailable',
    message: 'Current air quality telemetry is unavailable from OpenAQ ground station and Google Air Quality fallback.',
  };
}

