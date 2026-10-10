/**
 * AirPulse Data Provider Interface & Normalization Utilities
 *
 * All external data providers (OpenAQ, CPCB, IoT, etc.) must implement the
 * provider interface and pass data through these normalization functions.
 */

/**
 * Validate that a value is a real finite number within an optional range.
 * Returns the number or null if invalid/missing.
 *
 * @param {*} val
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number|null}
 */
export function validateNumeric(val, min, max) {
  if (val === undefined || val === null || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (!isFinite(n)) return null;
  if (min !== undefined && n < min) return null;
  if (max !== undefined && n > max) return null;
  return n;
}

/**
 * Validate and normalize an ISO 8601 timestamp string.
 * Returns an ISO string or throws if unparseable.
 *
 * @param {*} val
 * @param {string} [field='recorded_at']
 * @returns {string}
 */
export function validateTimestamp(val, field = 'recorded_at') {
  if (!val) throw new Error(`Missing required timestamp field: ${field}`);
  const d = new Date(val);
  if (isNaN(d.getTime())) throw new Error(`Invalid timestamp for ${field}: ${val}`);
  return d.toISOString();
}

/**
 * Normalize an observation reading from any provider into the standard schema.
 * Unknown or out-of-range values are cleanly sanitized to null.
 *
 * @param {object} raw
 * @returns {object}
 */
export function normalizeReading(raw) {
  return {
    station_code:  String(raw.station_code),
    recorded_at:   validateTimestamp(raw.recorded_at),
    aqi:           validateNumeric(raw.aqi, 0, 1000),
    aqi_category:  raw.aqi_category || null,
    pm25:          validateNumeric(raw.pm25, 0, 1500),
    pm10:          validateNumeric(raw.pm10, 0, 2000),
    no2:           validateNumeric(raw.no2, 0, 5000),
    so2:           validateNumeric(raw.so2, 0, 5000),
    co:            validateNumeric(raw.co, 0, 100000),
    o3:            validateNumeric(raw.o3, 0, 1000),
    temperature:   validateNumeric(raw.temperature, -50, 60),
    humidity:      validateNumeric(raw.humidity, 0, 100),
    pressure:      validateNumeric(raw.pressure, 800, 1100),
    source:        String(raw.source),
  };
}

/**
 * Normalize a station object from any provider into the standard schema.
 *
 * @param {object} raw
 * @returns {object}
 */
export function normalizeStation(raw) {
  const lat = parseFloat(raw.latitude);
  const lon = parseFloat(raw.longitude);
  if (!isFinite(lat) || !isFinite(lon)) {
    throw new Error(`Invalid coordinates for station ${raw.station_code}: lat=${raw.latitude}, lon=${raw.longitude}`);
  }
  return {
    station_code: String(raw.station_code),
    name:         String(raw.name),
    city:         String(raw.city),
    state:        String(raw.state),
    country:      String(raw.country || 'IN'),
    latitude:     lat,
    longitude:    lon,
    source_type:  String(raw.source_type || 'openaq'),
  };
}
