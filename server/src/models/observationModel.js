import { getPool } from '../config/db.js';

function formatObservation(row) {
  if (!row) return null;
  return {
    ...row,
    latitude: row.latitude != null ? parseFloat(row.latitude) : undefined,
    longitude: row.longitude != null ? parseFloat(row.longitude) : undefined,
    aqi: row.aqi != null ? parseFloat(row.aqi) : null,
    pm25: row.pm25 != null ? parseFloat(row.pm25) : null,
    pm10: row.pm10 != null ? parseFloat(row.pm10) : null,
    no2: row.no2 != null ? parseFloat(row.no2) : null,
    so2: row.so2 != null ? parseFloat(row.so2) : null,
    co: row.co != null ? parseFloat(row.co) : null,
    o3: row.o3 != null ? parseFloat(row.o3) : null,
    temperature: row.temperature != null ? parseFloat(row.temperature) : null,
    humidity: row.humidity != null ? parseFloat(row.humidity) : null,
    pressure: row.pressure != null ? parseFloat(row.pressure) : null,
  };
}

/**
 * Fetch the latest observation per station.
 * @param {object} opts
 * @param {number} [opts.limit]
 * @param {string} [opts.city]
 */
export async function findLatestObservations({ limit = 50, city } = {}) {
  const pool = getPool();
  const params = [];
  let cityFilter = '';

  if (city) {
    params.push(city);
    cityFilter = `AND LOWER(s.city) = LOWER($${params.length})`;
  }

  params.push(limit);

  const sql = `
    SELECT DISTINCT ON (o.station_id)
      o.id, o.station_id,
      s.station_code, s.name AS station_name, s.city, s.state,
      s.latitude, s.longitude,
      o.recorded_at, o.aqi, o.aqi_category,
      o.pm25, o.pm10, o.no2, o.so2, o.co, o.o3,
      o.temperature, o.humidity, o.pressure,
      o.source, o.ingested_at
    FROM environmental_observations o
    JOIN monitoring_stations s ON s.id = o.station_id
    WHERE s.is_active = TRUE ${cityFilter}
    ORDER BY o.station_id, o.recorded_at DESC
    LIMIT $${params.length}
  `;

  const { rows } = await pool.query(sql, params);
  return rows.map(formatObservation);
}

/**
 * Fetch observations (list) with optional station/time filters.
 * @param {object} opts
 * @param {number} [opts.stationId]
 * @param {string} [opts.from]   ISO8601
 * @param {string} [opts.to]     ISO8601
 * @param {number} [opts.limit]
 */
export async function findObservations({ stationId, from, to, limit = 100 } = {}) {
  const pool = getPool();
  const params = [];
  const conditions = [];

  if (stationId) {
    params.push(stationId);
    conditions.push(`o.station_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`o.recorded_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`o.recorded_at <= $${params.length}`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  params.push(limit);

  const sql = `
    SELECT
      o.id, o.station_id,
      s.station_code, s.name AS station_name, s.city, s.state,
      o.recorded_at, o.aqi, o.aqi_category,
      o.pm25, o.pm10, o.no2, o.so2, o.co, o.o3,
      o.temperature, o.humidity, o.pressure,
      o.source, o.ingested_at
    FROM environmental_observations o
    JOIN monitoring_stations s ON s.id = o.station_id
    ${where}
    ORDER BY o.recorded_at DESC
    LIMIT $${params.length}
  `;

  const { rows } = await pool.query(sql, params);
  return rows.map(formatObservation);
}

/**
 * Fetch historical observations for a specific station (for charts).
 * @param {object} opts
 * @param {number} opts.stationId
 * @param {string} [opts.from]
 * @param {string} [opts.to]
 * @param {number} [opts.limit]
 */
export async function findObservationHistory({ stationId, from, to, limit = 500 } = {}) {
  const pool = getPool();
  const params = [stationId];
  const extra = [];

  if (from) {
    params.push(from);
    extra.push(`o.recorded_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    extra.push(`o.recorded_at <= $${params.length}`);
  }

  const timeFilter = extra.length ? 'AND ' + extra.join(' AND ') : '';
  params.push(limit);

  const sql = `
    SELECT
      o.id, o.recorded_at,
      o.aqi, o.pm25, o.pm10,
      o.no2, o.so2, o.co, o.o3,
      o.temperature, o.humidity, o.pressure,
      o.source
    FROM environmental_observations o
    WHERE o.station_id = $1 ${timeFilter}
    ORDER BY o.recorded_at ASC
    LIMIT $${params.length}
  `;

  const { rows } = await pool.query(sql, params);
  return rows.map(formatObservation);
}

export async function findObservationsByDate(dateStr) {
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
      o.id AS id,
      o.id AS observation_id,
      o.recorded_at,
      o.aqi::float AS aqi,
      o.aqi_category,
      o.pm25::float AS pm25,
      o.pm10::float AS pm10,
      o.no2::float AS no2,
      o.so2::float AS so2,
      o.co::float AS co,
      o.o3::float AS o3,
      o.temperature::float AS temperature,
      o.humidity::float AS humidity,
      o.pressure::float AS pressure,
      o.source,
      o.ingested_at,
      'observed' AS data_type,
      (o.id IS NOT NULL) AS has_data
    FROM monitoring_stations s
    LEFT JOIN (
      SELECT DISTINCT ON (station_id)
        id, station_id, recorded_at, aqi, aqi_category,
        pm25, pm10, no2, so2, co, o3,
        temperature, humidity, pressure, source, ingested_at
      FROM environmental_observations
      WHERE CAST(recorded_at AT TIME ZONE 'Asia/Kolkata' AS date) = $1
      ORDER BY station_id, recorded_at DESC
    ) o ON o.station_id = s.id
    WHERE s.is_active = TRUE
    ORDER BY s.state, s.city, s.name;
  `;

  const { rows } = await pool.query(sql, [dateStr]);
  return rows.map((r) => ({
    ...formatObservation(r),
    has_data: Boolean(r.has_data),
    data_type: 'observed',
  }));
}

export async function getObservationsDateRange() {
  const pool = getPool();
  const sql = `
    SELECT
      TO_CHAR(MIN(recorded_at AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS min_date,
      TO_CHAR(MAX(recorded_at AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS max_date,
      COUNT(DISTINCT CAST(recorded_at AT TIME ZONE 'Asia/Kolkata' AS date))::int AS total_distinct_dates
    FROM environmental_observations;
  `;
  const { rows } = await pool.query(sql);
  return rows[0] || null;
}

/**
 * Upsert an observation (idempotent ingestion).
 * @param {object} obs
 */
export async function upsertObservation(obs) {
  const pool = getPool();
  const {
    station_id, recorded_at, aqi = null, aqi_category = null,
    pm25 = null, pm10 = null, no2 = null, so2 = null, co = null, o3 = null,
    temperature = null, humidity = null, pressure = null,
    source,
  } = obs;

  const { rows } = await pool.query(
    `INSERT INTO environmental_observations
       (station_id, recorded_at, aqi, aqi_category,
        pm25, pm10, no2, so2, co, o3,
        temperature, humidity, pressure, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (station_id, recorded_at, source) DO UPDATE SET
       aqi          = EXCLUDED.aqi,
       aqi_category = EXCLUDED.aqi_category,
       pm25         = EXCLUDED.pm25,
       pm10         = EXCLUDED.pm10,
       no2          = EXCLUDED.no2,
       so2          = EXCLUDED.so2,
       co           = EXCLUDED.co,
       o3           = EXCLUDED.o3,
       temperature  = EXCLUDED.temperature,
       humidity     = EXCLUDED.humidity,
       pressure     = EXCLUDED.pressure,
       ingested_at  = NOW()
     RETURNING id`,
    [station_id, recorded_at, aqi, aqi_category,
     pm25, pm10, no2, so2, co, o3,
     temperature, humidity, pressure, source]
  );
  return rows[0];
}


