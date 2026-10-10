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

export async function getDateRange() {
  return await getObservationsDateRange();
}

