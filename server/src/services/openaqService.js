import {
  discoverAllIndianLocations,
  isConfigured,
} from './ingestion/openaqProvider.js';
import {
  upsertOpenAQLocation,
  findOpenAQLocations,
  findStationById,
  findStationByCode,
  findNearbyStations,
  getOpenAQCoverageStats,
} from '../models/stationModel.js';

/**
 * Execute Indian OpenAQ location discovery and ingest into the monitoring_stations registry.
 * Distinguishes newly discovered stations from the primary 40 dashboard display set.
 *
 * @param {object} options
 * @param {number} [options.maxLocations=1000]
 * @param {number} [options.pageSize=100]
 */
export async function syncOpenAQLocations({ maxLocations = 1000, pageSize = 100 } = {}) {
  if (!isConfigured()) {
    const err = new Error('OPENAQ_API_KEY is not configured in server/.env');
    err.statusCode = 503;
    throw err;
  }

  const discovery = await discoverAllIndianLocations({ maxLocations, pageSize });
  let storedCount = 0;
  let skippedDbErrors = 0;
  const dbErrors = [];

  for (const loc of discovery.locations) {
    try {
      await upsertOpenAQLocation(loc);
      storedCount++;
    } catch (err) {
      skippedDbErrors++;
      dbErrors.push(`Failed to upsert station ${loc.station_code}: ${err.message}`);
    }
  }

  const coverage = await getOpenAQCoverageStats();

  return {
    status: 'ok',
    discovered_total: discovery.totalDiscovered,
    discovered_valid: discovery.totalValid,
    skipped_api_invalid: discovery.skippedInvalid,
    stored_in_database: storedCount,
    skipped_db_errors: skippedDbErrors,
    database_coverage: {
      total_locations: coverage.total_locations,
      dashboard_display_set: coverage.dashboard_stations,
      expanded_locations: coverage.expanded_network_stations,
      active_locations: coverage.active_locations,
      unique_cities: coverage.cities_count,
      unique_states: coverage.states_count,
      last_synced_at: coverage.last_synced_at,
    },
    pages_processed: discovery.totalPages,
    page_size: pageSize,
    api_rate_limits: discovery.apiLimits,
    discovery_errors: discovery.errors.slice(0, 10),
  };
}

/**
 * Get paginated list of OpenAQ locations stored in AIRPULSE.
 */
export async function getOpenAQLocationsList(params = {}) {
  return await findOpenAQLocations(params);
}

/**
 * Get details for a specific OpenAQ station.
 */
export async function getOpenAQLocationDetails(idOrCode) {
  let station = null;
  const numericId = parseInt(idOrCode, 10);
  if (!isNaN(numericId) && String(numericId) === String(idOrCode)) {
    station = await findStationById(numericId);
  }

  if (!station) {
    station = await findStationByCode(String(idOrCode));
  }

  if (!station) {
    const err = new Error(`OpenAQ location not found: '${idOrCode}'`);
    err.statusCode = 404;
    throw err;
  }

  return station;
}

/**
 * Search nearby OpenAQ stations using PostGIS geospatial proximity.
 *
 * @param {object} query
 * @param {number|string} query.latitude
 * @param {number|string} query.longitude
 * @param {number|string} [query.radiusMeters=25000]
 * @param {number|string} [query.limit=20]
 */
export async function searchNearbyOpenAQLocations({ latitude, longitude, radiusMeters, limit } = {}) {
  if (latitude === undefined || longitude === undefined) {
    const err = new Error("Query parameters 'lat' and 'lon' (or 'latitude' and 'longitude') are required.");
    err.statusCode = 400;
    throw err;
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const err = new Error(`Invalid geographic coordinates: latitude=${latitude}, longitude=${longitude}. Must be valid WGS84 coordinates.`);
    err.statusCode = 400;
    throw err;
  }

  const radius = radiusMeters ? parseInt(radiusMeters, 10) : 25000;
  const lim = limit ? parseInt(limit, 10) : 20;

  const results = await findNearbyStations({
    latitude: lat,
    longitude: lon,
    radiusMeters: radius,
    limit: lim,
  });

  return {
    query: {
      latitude: lat,
      longitude: lon,
      radius_meters: radius,
      radius_km: radius / 1000,
      limit: lim,
    },
    count: results.length,
    locations: results,
  };
}

/**
 * Retrieve database coverage statistics.
 */
export async function getOpenAQCoverage() {
  const stats = await getOpenAQCoverageStats();
  return {
    provider: 'OpenAQ v3 REST API',
    country: 'IN (India)',
    ...stats,
  };
}
