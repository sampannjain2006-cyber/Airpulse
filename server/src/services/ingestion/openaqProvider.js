/**
 * OpenAQ Data Provider
 *
 * Connects to OpenAQ REST API v3 for real monitoring station metadata and measurements in India.
 * Required env var: OPENAQ_API_KEY (stored in server/.env)
 *
 * Free Tier Quota: 60 requests/minute.
 * Implements:
 *   - Authenticated HTTPS requests with rate-limit tracking
 *   - Automatic HTTP 429 backoff handling
 *   - Paged discovery of Indian locations (iso=IN)
 *   - Coordinate bounds validation and sanitization
 *   - Idempotent data normalization
 */

import { env } from '../../config/env.js';
import { normalizeReading, validateNumeric } from './providerInterface.js';

const OPENAQ_BASE = 'https://api.openaq.org/v3';

export function isConfigured() {
  return Boolean(env.OPENAQ_API_KEY);
}

/**
 * Make an authenticated request to the OpenAQ v3 API with retry & rate limit protection.
 * Never logs or prints the API key value.
 */
async function openaqFetchWithMeta(path, params = {}, retryCount = 0) {
  const url = new URL(`${OPENAQ_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    headers: {
      'X-API-Key': env.OPENAQ_API_KEY,
      'Accept': 'application/json',
    },
  });

  const rateLimit = {
    limit: parseInt(res.headers.get('x-ratelimit-limit') || '60', 10),
    remaining: parseInt(res.headers.get('x-ratelimit-remaining') || '59', 10),
    reset: parseInt(res.headers.get('x-ratelimit-reset') || '60', 10),
    used: parseInt(res.headers.get('x-ratelimit-used') || '0', 10),
  };

  // Handle rate limiting (HTTP 429)
  if (res.status === 429 && retryCount < 2) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10);
    console.warn(`[OpenAQ] Rate limit hit (HTTP 429). Waiting ${retryAfter}s before retry...`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return openaqFetchWithMeta(path, params, retryCount + 1);
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAQ API error HTTP ${res.status} for ${path}: ${errorText.slice(0, 150)}`);
  }

  const data = await res.json();
  return { data, rateLimit };
}

async function openaqFetch(path, params = {}) {
  const { data } = await openaqFetchWithMeta(path, params);
  return data;
}

const PARAM_MAP = {
  pm25: 'pm25',
  pm10: 'pm10',
  no2:  'no2',
  so2:  'so2',
  co:   'co',
  o3:   'o3',
  temperature: 'temperature',
  relativehumidity: 'humidity',
  humidity: 'humidity',
  pressure: 'pressure',
};

const KNOWN_INDIAN_CITIES = [
  'Delhi', 'New Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru', 'Bangalore',
  'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
  'Indore', 'Bhopal', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra',
  'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad',
  'Dhanbad', 'Amritsar', 'Allahabad', 'Prayagraj', 'Ranchi', 'Howrah', 'Coimbatore',
  'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota',
  'Guwahati', 'Chandigarh', 'Gaya', 'Noida', 'Gurugram', 'Gurgaon', 'Thiruvananthapuram',
  'Kochi', 'Visakhapatnam', 'Surat', 'Dehradun', 'Shimla', 'Udaipur', 'Jammu'
];

export function extractCity(loc) {
  if (loc.locality && loc.locality.trim() && loc.locality.trim().length > 2) {
    return loc.locality.trim();
  }
  const searchString = `${loc.name || ''} ${loc.owner?.name || ''}`;
  for (const city of KNOWN_INDIAN_CITIES) {
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(searchString)) return city;
  }
  const parts = (loc.name || '').split(/[,-]/).map((s) => s.trim());
  if (parts.length > 1 && parts[1].length > 2 && parts[1].length < 30) {
    return parts[1];
  }
  return 'India';
}

export function extractState(loc) {
  const city = extractCity(loc);
  if (city.toLowerCase().includes('delhi')) return 'Delhi';
  if (city.toLowerCase().includes('mumbai') || city.toLowerCase().includes('pune') || city.toLowerCase().includes('nagpur')) return 'Maharashtra';
  if (city.toLowerCase().includes('bengaluru') || city.toLowerCase().includes('bangalore')) return 'Karnataka';
  if (city.toLowerCase().includes('chennai') || city.toLowerCase().includes('coimbatore')) return 'Tamil Nadu';
  if (city.toLowerCase().includes('kolkata') || city.toLowerCase().includes('howrah')) return 'West Bengal';
  if (city.toLowerCase().includes('hyderabad')) return 'Telangana';
  if (city.toLowerCase().includes('jaipur') || city.toLowerCase().includes('jodhpur') || city.toLowerCase().includes('kota')) return 'Rajasthan';
  if (city.toLowerCase().includes('lucknow') || city.toLowerCase().includes('kanpur') || city.toLowerCase().includes('noida') || city.toLowerCase().includes('ghaziabad')) return 'Uttar Pradesh';
  return loc.country?.name || 'India';
}

/**
 * Normalize an OpenAQ location payload into our database record format.
 */
export function normalizeLocation(loc) {
  const lat = parseFloat(loc.coordinates?.latitude);
  const lon = parseFloat(loc.coordinates?.longitude);

  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error(`Invalid geographic coordinates for location ${loc.id}: lat=${loc.coordinates?.latitude}, lon=${loc.coordinates?.longitude}`);
  }

  // Extract available parameters from sensors
  const sensorsList = (loc.sensors || [])
    .map((s) => s.parameter?.name?.toLowerCase() || s.parameter?.toLowerCase())
    .filter(Boolean);
  const uniqueSensors = [...new Set(sensorsList)];

  const lastUpdated = loc.datetimeLast?.utc || loc.datetimeLast?.local || null;

  return {
    station_code: `openaq-${loc.id}`,
    openaq_location_id: loc.id,
    name: loc.name || `OpenAQ Station ${loc.id}`,
    locality: loc.locality || null,
    city: extractCity(loc),
    state: extractState(loc),
    country: 'IN',
    latitude: lat,
    longitude: lon,
    timezone: loc.timezone || 'Asia/Kolkata',
    owner_name: loc.owner?.name || null,
    provider_name: loc.provider?.name || null,
    sensors_summary: JSON.stringify(uniqueSensors),
    last_updated_at: lastUpdated,
    source_type: 'openaq',
    is_active: Boolean(lastUpdated),
  };
}

/**
 * Fetch a single page of locations from OpenAQ v3.
 */
export async function fetchLocationsPage({ page = 1, limit = 100 } = {}) {
  if (!isConfigured()) {
    return { results: [], meta: { page, limit, found: 0 }, rateLimit: null };
  }

  const { data, rateLimit } = await openaqFetchWithMeta('/locations', {
    iso: 'IN',
    page,
    limit,
  });

  return {
    results: data.results || [],
    meta: data.meta || { page, limit, found: 0 },
    rateLimit,
  };
}

/**
 * Comprehensive Indian location discovery process using OpenAQ v3 pagination.
 *
 * Iterates through pages until:
 * 1. The API returns an empty page or meta.found indicates completion.
 * 2. Or the configured safety ceiling (default 1000) is reached.
 *
 * Rate Limit Protection:
 * - 200ms throttle between successive page requests.
 * - Monitors x-ratelimit-remaining; sleeps if approaching zero.
 */
export async function discoverAllIndianLocations({ maxLocations = 1000, pageSize = 100 } = {}) {
  if (!isConfigured()) {
    console.warn('[OpenAQ] OPENAQ_API_KEY is not configured — skipping discovery.');
    return {
      totalDiscovered: 0,
      totalValid: 0,
      skippedInvalid: 0,
      totalPages: 0,
      locations: [],
      apiLimits: null,
      errors: ['OPENAQ_API_KEY not configured'],
    };
  }

  const discoveredLocations = [];
  const errors = [];
  let skippedInvalid = 0;
  let currentPage = 1;
  let hasMore = true;
  let lastRateLimit = null;

  console.log(`[OpenAQ Discovery] Starting Indian location discovery (ceiling: ${maxLocations}, page size: ${pageSize})...`);

  while (hasMore && discoveredLocations.length < maxLocations) {
    try {
      const pageResult = await fetchLocationsPage({ page: currentPage, limit: pageSize });
      lastRateLimit = pageResult.rateLimit;
      const results = pageResult.results || [];

      if (results.length === 0) {
        console.log(`[OpenAQ Discovery] Page ${currentPage} returned 0 results. Completed.`);
        hasMore = false;
        break;
      }

      console.log(`[OpenAQ Discovery] Page ${currentPage}: received ${results.length} locations (API meta: ${JSON.stringify(pageResult.meta?.found)}).`);

      for (const raw of results) {
        try {
          const normalized = normalizeLocation(raw);
          discoveredLocations.push(normalized);
        } catch (normErr) {
          skippedInvalid++;
          errors.push(`Skipped location ${raw.id}: ${normErr.message}`);
        }
      }

      // Check if this was the final page
      if (results.length < pageSize) {
        hasMore = false;
      } else {
        currentPage++;
        // Rate limit pacing: 200ms pause between page fetches
        await new Promise((r) => setTimeout(r, 200));

        // If remaining API calls are critically low (< 5), pause for reset
        if (lastRateLimit && lastRateLimit.remaining < 5) {
          const pauseSec = Math.max(lastRateLimit.reset || 10, 2);
          console.warn(`[OpenAQ Discovery] Rate limit remaining is low (${lastRateLimit.remaining}). Pausing ${pauseSec}s...`);
          await new Promise((r) => setTimeout(r, pauseSec * 1000));
        }
      }
    } catch (err) {
      console.error(`[OpenAQ Discovery] Error fetching page ${currentPage}:`, err.message);
      errors.push(`Page ${currentPage} error: ${err.message}`);
      break;
    }
  }

  console.log(`[OpenAQ Discovery] Discovery finished. Processed ${currentPage} pages. Total valid: ${discoveredLocations.length}, Skipped invalid: ${skippedInvalid}.`);

  return {
    totalDiscovered: discoveredLocations.length + skippedInvalid,
    totalValid: discoveredLocations.length,
    skippedInvalid,
    totalPages: currentPage,
    locations: discoveredLocations,
    apiLimits: lastRateLimit,
    errors,
  };
}

/**
 * Fetch initial monitoring stations (backward-compatible).
 */
export async function fetchStations({ limit = 40 } = {}) {
  if (!isConfigured()) return [];
  try {
    const data = await openaqFetch('/locations', { iso: 'IN', limit });
    return (data.results || []).map((loc) => {
      try {
        return normalizeLocation(loc);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    console.error('[OpenAQ] fetchStations failed:', err.message);
    return [];
  }
}

/**
 * Fetch the latest real measurements for a given station.
 */
export async function fetchLatestReadings(stationCode) {
  if (!isConfigured()) return [];
  const locationId = stationCode.replace('openaq-', '');
  if (!locationId) return [];

  try {
    const data = await openaqFetch(`/locations/${locationId}/sensors`);
    const sensors = data.results || [];
    if (!sensors.length) return [];

    const reading = {
      station_code: stationCode,
      source: 'openaq',
      aqi: null,
      aqi_category: null,
    };
    let recorded_at = null;

    for (const s of sensors) {
      const paramName = (s.parameter?.name || '').toLowerCase();
      const field = PARAM_MAP[paramName];

      if (field && s.latest && typeof s.latest.value === 'number') {
        const val = validateNumeric(s.latest.value);
        if (val !== null) {
          reading[field] = val;
          const dt = new Date(s.latest.datetime?.utc || s.latest.datetime?.local);
          if (!isNaN(dt.getTime())) {
            if (!recorded_at || dt > new Date(recorded_at)) {
              recorded_at = dt.toISOString();
            }
          }
        }
      }
    }

    const hasAnyMeasurement = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'].some((k) => reading[k] !== undefined);
    if (!recorded_at || !hasAnyMeasurement) return [];

    reading.recorded_at = recorded_at;
    return [normalizeReading(reading)];
  } catch (err) {
    console.warn(`[OpenAQ] fetchLatestReadings for ${stationCode} skipped: ${err.message}`);
    return [];
  }
}

/**
 * Fetch real historical daily PM2.5 readings for a given station.
 */
export async function fetchHistoricalDailyReadings(stationCode, { limit = 200 } = {}) {
  if (!isConfigured()) return [];
  const locationId = stationCode.replace('openaq-', '');
  if (!locationId) return [];

  try {
    const data = await openaqFetch(`/locations/${locationId}/sensors`);
    const sensors = data.results || [];
    if (!sensors.length) return [];

    const pm25Sensors = sensors.filter((s) => (s.parameter?.name || '').toLowerCase() === 'pm25');
    if (!pm25Sensors.length) return [];

    pm25Sensors.sort((a, b) => {
      const dateA = new Date(a.datetimeLast?.utc || a.latest?.datetime?.utc || 0).getTime();
      const dateB = new Date(b.datetimeLast?.utc || b.latest?.datetime?.utc || 0).getTime();
      return dateB - dateA;
    });

    for (const sensor of pm25Sensors) {
      try {
        const daysData = await openaqFetch(`/sensors/${sensor.id}/days`, { limit });
        const days = daysData.results || [];
        if (!days.length) continue;

        const readings = [];
        for (const d of days) {
          const val = validateNumeric(d.value, 0, 1500);
          const rawDt = d.period?.datetimeFrom?.utc || d.period?.datetimeFrom?.local;
          if (val !== null && rawDt) {
            readings.push(
              normalizeReading({
                station_code: stationCode,
                recorded_at: rawDt,
                pm25: val,
                source: 'openaq',
              })
            );
          }
        }

        if (readings.length > 0) return readings;
      } catch {
        continue;
      }
    }

    return [];
  } catch (err) {
    console.warn(`[OpenAQ] fetchHistoricalDailyReadings for ${stationCode} skipped: ${err.message}`);
    return [];
  }
}
