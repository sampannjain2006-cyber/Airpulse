import { getPool } from '../config/db.js';

function formatStation(row) {
  if (!row) return null;
  let sensors = [];
  if (row.sensors_summary) {
    sensors = typeof row.sensors_summary === 'string'
      ? JSON.parse(row.sensors_summary)
      : row.sensors_summary;
  }

  return {
    ...row,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    sensors_summary: sensors,
    distance_meters: row.distance_meters !== undefined ? parseFloat(row.distance_meters) : undefined,
  };
}

/**
 * Fetch monitoring stations.
 * By default (dashboardOnly = true), returns the 40 primary dashboard monitoring stations.
 * When dashboardOnly = false or scope = 'all', queries the broader OpenAQ network.
 *
 * @param {object} filters
 * @param {string} [filters.city]
 * @param {string} [filters.state]
 * @param {number} [filters.limit]
 * @param {boolean} [filters.dashboardOnly=true]
 * @param {string} [filters.scope]
 */
export async function findAllStations({ city, state, limit = 200, dashboardOnly = true, scope } = {}) {
  const pool = getPool();
  const params = [];
  const conditions = ['is_active = TRUE'];

  // Default to dashboard display set unless explicitly requesting all
  const isAll = scope === 'all' || dashboardOnly === false;
  if (!isAll) {
    conditions.push('is_dashboard_station = TRUE');
  }

  if (city) {
    params.push(city);
    conditions.push(`LOWER(city) = LOWER($${params.length})`);
  }
  if (state) {
    params.push(state);
    conditions.push(`LOWER(state) = LOWER($${params.length})`);
  }

  params.push(limit);
  const where = conditions.join(' AND ');

  const sql = `
    SELECT
      id, station_code, openaq_location_id, name, locality, city, state, country,
      latitude, longitude, source_type, is_dashboard_station, is_active,
      timezone, owner_name, provider_name, sensors_summary, last_updated_at,
      created_at, updated_at
    FROM monitoring_stations
    WHERE ${where}
    ORDER BY is_dashboard_station DESC, state, city, name
    LIMIT $${params.length}
  `;

  const { rows } = await pool.query(sql, params);
  return rows.map(formatStation);
}

/**
 * Fetch a single station by numeric ID.
 * @param {number} id
 */
export async function findStationById(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
      id, station_code, openaq_location_id, name, locality, city, state, country,
      latitude, longitude, source_type, is_dashboard_station, is_active,
      timezone, owner_name, provider_name, sensors_summary, last_updated_at,
      created_at, updated_at
    FROM monitoring_stations
    WHERE id = $1`,
    [id]
  );
  return formatStation(rows[0]);
}

/**
 * Fetch a single station by station_code.
 * @param {string} code
 */
export async function findStationByCode(code) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
      id, station_code, openaq_location_id, name, locality, city, state, country,
      latitude, longitude, source_type, is_dashboard_station, is_active,
      timezone, owner_name, provider_name, sensors_summary, last_updated_at,
      created_at, updated_at
    FROM monitoring_stations
    WHERE station_code = $1 OR openaq_location_id = CAST(NULLIF(regexp_replace($1, '^openaq-', ''), '') AS integer)`,
    [code]
  );
  return formatStation(rows[0]);
}

/**
 * Upsert a station record (idempotent ingestion).
 * Preserves is_dashboard_station if already set.
 * @param {object} station
 */
export async function upsertStation(station) {
  const pool = getPool();
  const {
    station_code, name, city, state, country = 'IN',
    latitude, longitude, source_type = 'openaq',
  } = station;

  const { rows } = await pool.query(
    `INSERT INTO monitoring_stations
       (station_code, name, city, state, country, latitude, longitude, source_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (station_code) DO UPDATE SET
       name        = EXCLUDED.name,
       city        = EXCLUDED.city,
       state       = EXCLUDED.state,
       latitude    = EXCLUDED.latitude,
       longitude   = EXCLUDED.longitude,
       source_type = EXCLUDED.source_type,
       updated_at  = NOW()
     RETURNING id, station_code, name, city, state`,
    [station_code, name, city, state, country, latitude, longitude, source_type]
  );
  return rows[0];
}

/**
 * Upsert a fully discovered OpenAQ location record.
 * Never resets is_dashboard_station to FALSE if already TRUE.
 *
 * @param {object} loc
 */
export async function upsertOpenAQLocation(loc) {
  const pool = getPool();
  const {
    station_code,
    openaq_location_id,
    name,
    locality,
    city,
    state,
    country = 'IN',
    latitude,
    longitude,
    timezone,
    owner_name,
    provider_name,
    sensors_summary,
    last_updated_at,
    source_type = 'openaq',
    is_active = true,
  } = loc;

  const sql = `
    INSERT INTO monitoring_stations
      (station_code, openaq_location_id, name, locality, city, state, country,
       latitude, longitude, timezone, owner_name, provider_name,
       sensors_summary, last_updated_at, source_type, is_active)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (station_code) DO UPDATE SET
      openaq_location_id = COALESCE(EXCLUDED.openaq_location_id, monitoring_stations.openaq_location_id),
      name               = EXCLUDED.name,
      locality           = COALESCE(EXCLUDED.locality, monitoring_stations.locality),
      city               = EXCLUDED.city,
      state              = EXCLUDED.state,
      latitude           = EXCLUDED.latitude,
      longitude          = EXCLUDED.longitude,
      timezone           = COALESCE(EXCLUDED.timezone, monitoring_stations.timezone),
      owner_name         = COALESCE(EXCLUDED.owner_name, monitoring_stations.owner_name),
      provider_name      = COALESCE(EXCLUDED.provider_name, monitoring_stations.provider_name),
      sensors_summary    = COALESCE(EXCLUDED.sensors_summary, monitoring_stations.sensors_summary),
      last_updated_at    = COALESCE(EXCLUDED.last_updated_at, monitoring_stations.last_updated_at),
      updated_at         = NOW()
    RETURNING id, station_code, openaq_location_id, is_dashboard_station, name, city, state;
  `;

  const { rows } = await pool.query(sql, [
    station_code,
    openaq_location_id,
    name,
    locality,
    city,
    state,
    country,
    latitude,
    longitude,
    timezone,
    owner_name,
    provider_name,
    sensors_summary,
    last_updated_at,
    source_type,
    is_active,
  ]);
  return rows[0];
}

/**
 * PostGIS Geospatial Nearby Station Search.
 * Finds all active stations within radiusMeters of (latitude, longitude),
 * sorted by proximity (distance in meters).
 *
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {number} [params.radiusMeters=25000]
 * @param {number} [params.limit=20]
 */
export async function findNearbyStations({ latitude, longitude, radiusMeters = 25000, limit = 20 } = {}) {
  const pool = getPool();
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const radius = Math.min(Math.max(parseInt(radiusMeters, 10) || 25000, 100), 500000); // 100m to 500km
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const err = new Error(`Invalid geographic coordinates: lat=${latitude}, lon=${longitude}`);
    err.statusCode = 400;
    throw err;
  }

  const sql = `
    SELECT
      id, station_code, openaq_location_id, name, locality, city, state, country,
      latitude::float, longitude::float, source_type, is_dashboard_station, is_active,
      timezone, owner_name, provider_name, sensors_summary, last_updated_at,
      ROUND(ST_Distance(geog, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::numeric, 1)::float AS distance_meters
    FROM monitoring_stations
    WHERE
      is_active = TRUE
      AND ST_DWithin(geog, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
    ORDER BY distance_meters ASC
    LIMIT $4;
  `;

  const { rows } = await pool.query(sql, [lat, lon, radius, lim]);
  return rows.map(formatStation);
}

/**
 * Paginated query for all stored OpenAQ locations.
 */
export async function findOpenAQLocations({ page = 1, limit = 50, city, state, search, dashboardOnly } = {}) {
  const pool = getPool();
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const offset = (p - 1) * lim;

  const conditions = ["source_type = 'openaq'"];
  const params = [];

  if (dashboardOnly === true || dashboardOnly === 'true') {
    conditions.push('is_dashboard_station = TRUE');
  }

  if (city) {
    params.push(city);
    conditions.push(`LOWER(city) = LOWER($${params.length})`);
  }

  if (state) {
    params.push(state);
    conditions.push(`LOWER(state) = LOWER($${params.length})`);
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(locality, '')) LIKE $${params.length} OR LOWER(city) LIKE $${params.length})`);
  }

  const where = conditions.join(' AND ');

  const countSql = `SELECT count(*)::int AS total FROM monitoring_stations WHERE ${where};`;
  const countRes = await pool.query(countSql, params);
  const total = countRes.rows[0]?.total || 0;

  params.push(lim);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const sql = `
    SELECT
      id, station_code, openaq_location_id, name, locality, city, state, country,
      latitude::float, longitude::float, source_type, is_dashboard_station, is_active,
      timezone, owner_name, provider_name, sensors_summary, last_updated_at,
      created_at, updated_at
    FROM monitoring_stations
    WHERE ${where}
    ORDER BY is_dashboard_station DESC, id ASC
    LIMIT ${limitParam} OFFSET ${offsetParam};
  `;

  const { rows } = await pool.query(sql, params);

  return {
    total,
    page: p,
    limit: lim,
    totalPages: Math.ceil(total / lim) || 1,
    data: rows.map(formatStation),
  };
}

/**
 * Summary statistics for OpenAQ coverage stored in AIRPULSE.
 */
export async function getOpenAQCoverageStats() {
  const pool = getPool();
  const sql = `
    SELECT
      count(*)::int AS total_locations,
      count(*) FILTER (WHERE is_dashboard_station = TRUE)::int AS dashboard_stations,
      count(*) FILTER (WHERE is_dashboard_station = FALSE)::int AS expanded_network_stations,
      count(*) FILTER (WHERE is_active = TRUE)::int AS active_locations,
      count(DISTINCT city)::int AS cities_count,
      count(DISTINCT state)::int AS states_count,
      max(updated_at) AS last_synced_at
    FROM monitoring_stations
    WHERE source_type = 'openaq';
  `;
  const { rows } = await pool.query(sql);
  return rows[0] || {};
}
