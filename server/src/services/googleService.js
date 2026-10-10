import { env } from '../config/env.js';
import { getPool } from '../config/db.js';

// In-memory cache structures with TTL
const geocodeCache = new Map();
const airQualityCache = new Map();

const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const AIR_QUALITY_CACHE_TTL_MS = 15 * 60 * 1000;  // 15 minutes
const MAX_CACHE_ENTRIES = 500;

function cleanCache(cache) {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

/**
 * Check if Google Maps / Air Quality API key is configured.
 */
export function isGoogleConfigured() {
  return Boolean(env.GOOGLE_MAPS_API_KEY && env.GOOGLE_MAPS_API_KEY.trim() !== '');
}

/**
 * Returns safe non-sensitive configuration and capability status.
 * Never leaks the actual secret key.
 */
export function getGoogleConfigStatus() {
  const configured = isGoogleConfigured();
  return {
    configured,
    env_var_name: 'GOOGLE_MAPS_API_KEY',
    services: {
      geocoding_api: {
        purpose: 'Place name & address resolution to WGS84 geographic coordinates',
        status: configured ? 'available' : 'unconfigured',
        endpoint: 'https://maps.googleapis.com/maps/api/geocode/json',
      },
      air_quality_api: {
        purpose: 'Spatial air quality modeling & hourly concentration lookups',
        status: configured ? 'available' : 'unconfigured',
        endpoint: 'https://airquality.googleapis.com/v1/currentConditions:lookup',
      },
    },
    billing_required: true,
    billing_note: 'Google Cloud Platform requires an active billing account for Geocoding and Air Quality APIs.',
    setup_instructions: configured
      ? 'Google services are configured.'
      : 'To enable live Google Geocoding and Air Quality API lookups: 1. Create a Google Cloud project with billing enabled. 2. Enable Geocoding API and Air Quality API. 3. Add GOOGLE_MAPS_API_KEY=<your-key> to server/.env and restart.',
  };
}

/**
 * Resolve a user-entered location/place name to canonical name and WGS84 coordinates.
 *
 * @param {string} query - Location text (e.g. 'Connaught Place, New Delhi', 'Shimla', 'Whitefield')
 * @returns {Promise<object>} Resolved location details
 */
export async function resolveLocation(query) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    const err = new Error('Query parameter is required for location resolution.');
    err.statusCode = 400;
    throw err;
  }

  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();

  // Check in-memory cache
  cleanCache(geocodeCache);
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, cached: true };
  }

  // If Google Maps API key is configured, use Google Geocoding API
  if (isGoogleConfigured()) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address', cleanQuery);
      url.searchParams.set('region', 'in'); // bias towards India
      url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Google Geocoding API HTTP error ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();

      if (json.status === 'OK' && json.results && json.results.length > 0) {
        const top = json.results[0];
        const lat = top.geometry?.location?.lat;
        const lon = top.geometry?.location?.lng;

        if (typeof lat !== 'number' || typeof lon !== 'number') {
          throw new Error('Google Geocoding returned malformed coordinates');
        }

        let city = '';
        let state = '';
        let country = 'India';

        if (Array.isArray(top.address_components)) {
          for (const comp of top.address_components) {
            if (comp.types.includes('locality')) city = comp.long_name;
            if (!city && comp.types.includes('administrative_area_level_2')) city = comp.long_name;
            if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
            if (comp.types.includes('country')) country = comp.long_name;
          }
        }

        const result = {
          found: true,
          canonical_name: top.formatted_address,
          city: city || cleanQuery,
          state: state || 'India',
          country,
          latitude: lat,
          longitude: lon,
          place_id: top.place_id,
          location_type: top.geometry?.location_type || 'APPROXIMATE',
          resolution_source: 'google_geocoding',
          google_status: 'ok',
        };

        geocodeCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
        });

        return result;
      }

      if (json.status === 'ZERO_RESULTS') {
        return {
          found: false,
          query: cleanQuery,
          error: `No geographic location matches found for '${cleanQuery}'.`,
          resolution_source: 'google_geocoding',
          google_status: 'ZERO_RESULTS',
        };
      }

      if (json.status === 'OVER_QUERY_LIMIT') {
        const err = new Error('Google Geocoding API quota exceeded or billing not enabled.');
        err.statusCode = 429;
        throw err;
      }

      if (json.status === 'REQUEST_DENIED') {
        const err = new Error(`Google Geocoding API request denied: ${json.error_message || 'Check API key restrictions'}`);
        err.statusCode = 403;
        throw err;
      }

      throw new Error(`Google Geocoding returned status: ${json.status} (${json.error_message || 'Unknown'})`);
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Google Geocoding API request timed out after 5000ms.');
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      // Re-throw specific HTTP errors
      if (err.statusCode) throw err;
      console.warn(`[Google Geocoding] Fetch failed: ${err.message}. Attempting fallback to local database.`);
    }
  }

  // Graceful Local Database & Geographic Reference Fallback
  // (Used when Google API key is unconfigured or offline)
  const INDIAN_CITIES_COORDINATES = {
    'shimla': { lat: 31.1048, lon: 77.1734, state: 'Himachal Pradesh', name: 'Shimla, Himachal Pradesh, India' },
    'agra': { lat: 27.1767, lon: 78.0081, state: 'Uttar Pradesh', name: 'Agra, Uttar Pradesh, India' },
    'jaipur': { lat: 26.9124, lon: 75.7873, state: 'Rajasthan', name: 'Jaipur, Rajasthan, India' },
    'varanasi': { lat: 25.3176, lon: 82.9739, state: 'Uttar Pradesh', name: 'Varanasi, Uttar Pradesh, India' },
    'panaji': { lat: 15.4909, lon: 73.8278, state: 'Goa', name: 'Panaji, Goa, India' },
    'srinagar': { lat: 34.0837, lon: 74.7973, state: 'Jammu and Kashmir', name: 'Srinagar, Jammu and Kashmir, India' },
    'dehradun': { lat: 30.3165, lon: 78.0322, state: 'Uttarakhand', name: 'Dehradun, Uttarakhand, India' },
    'pune': { lat: 18.5204, lon: 73.8567, state: 'Maharashtra', name: 'Pune, Maharashtra, India' },
    'ahmedabad': { lat: 23.0225, lon: 72.5714, state: 'Gujarat', name: 'Ahmedabad, Gujarat, India' },
    'bhopal': { lat: 23.2599, lon: 77.4126, state: 'Madhya Pradesh', name: 'Bhopal, Madhya Pradesh, India' },
    'chandigarh': { lat: 30.7333, lon: 76.7794, state: 'Chandigarh', name: 'Chandigarh, India' },
    'guwahati': { lat: 26.1445, lon: 91.7362, state: 'Assam', name: 'Guwahati, Assam, India' },
    'thiruvananthapuram': { lat: 8.5241, lon: 76.9366, state: 'Kerala', name: 'Thiruvananthapuram, Kerala, India' },
  };

  const cityMatch = INDIAN_CITIES_COORDINATES[cleanQuery.toLowerCase()];
  if (cityMatch) {
    const result = {
      found: true,
      canonical_name: cityMatch.name,
      city: cleanQuery,
      state: cityMatch.state,
      country: 'India',
      latitude: cityMatch.lat,
      longitude: cityMatch.lon,
      resolution_source: 'local_geographic_registry',
      google_status: isGoogleConfigured() ? 'error_fallback' : 'unconfigured',
    };
    geocodeCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
    });
    return result;
  }

  // Query the 764 OpenAQ monitoring stations in PostgreSQL for city/locality match
  const pool = getPool();
  if (pool) {
    try {
      const dbRes = await pool.query(
        `SELECT city, state, country, latitude::float, longitude::float, name
         FROM monitoring_stations
         WHERE LOWER(city) = LOWER($1) OR LOWER(locality) = LOWER($1) OR LOWER(name) LIKE $2
         ORDER BY is_dashboard_station DESC, id ASC
         LIMIT 1`,
        [cleanQuery, `%${cleanQuery.toLowerCase()}%`]
      );

      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        const result = {
          found: true,
          canonical_name: `${row.city}, ${row.state}, ${row.country}`,
          city: row.city,
          state: row.state,
          country: row.country || 'India',
          latitude: row.latitude,
          longitude: row.longitude,
          matched_station_name: row.name,
          resolution_source: 'local_database_fallback',
          google_status: isGoogleConfigured() ? 'error_fallback' : 'unconfigured',
        };

        geocodeCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
        });

        return result;
      }
    } catch (dbErr) {
      console.error('[Google Service] Local fallback query error:', dbErr.message);
    }
  }

  return {
    found: false,
    query: cleanQuery,
    error: isGoogleConfigured()
      ? `Could not resolve location '${cleanQuery}'.`
      : `Location '${cleanQuery}' not found in local registry, and GOOGLE_MAPS_API_KEY is not configured in server/.env for Google Geocoding API.`,
    resolution_source: isGoogleConfigured() ? 'google_geocoding' : 'unconfigured',
    google_status: isGoogleConfigured() ? 'not_found' : 'unconfigured',
  };
}

/**
 * Fetch air quality from Google Air Quality API for a given coordinate.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<object>} Google Air Quality response or status
 */
export async function fetchAirQuality(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const err = new Error(`Invalid geographic coordinates: lat=${latitude}, lon=${longitude}`);
    err.statusCode = 400;
    throw err;
  }

  if (!isGoogleConfigured()) {
    return {
      available: false,
      status: 'unconfigured',
      provider: 'Google Air Quality API',
      data_type: 'modelled',
      message: 'GOOGLE_MAPS_API_KEY is not configured in server/.env. Air Quality API lookup unavailable.',
      setup_hint: 'Configure GOOGLE_MAPS_API_KEY in server/.env to enable live Google Air Quality lookups.',
    };
  }

  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  cleanCache(airQualityCache);
  const cached = airQualityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, cached: true };
  }

  try {
    const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${env.GOOGLE_MAPS_API_KEY}`;
    const payload = {
      location: { latitude: lat, longitude: lon },
      extraComputations: [
        'HEALTH_RECOMMENDATIONS',
        'DOMINANT_POLLUTANT_CONCENTRATION',
        'POLLUTANT_CONCENTRATION',
        'LOCAL_AQI',
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch {}
      const errMsg = errJson?.error?.message || errText;

      if (res.status === 403 || res.status === 429) {
        return {
          available: false,
          status: 'quota_exceeded_or_billing_disabled',
          provider: 'Google Air Quality API',
          data_type: 'modelled',
          message: `Google Air Quality API error (${res.status}): ${errMsg}`,
        };
      }

      return {
        available: false,
        status: 'api_error',
        provider: 'Google Air Quality API',
        data_type: 'modelled',
        message: `Google Air Quality API HTTP ${res.status}: ${errMsg}`,
      };
    }

    const json = await res.json();

    // Parse Google response
    let uaqi = null;
    let localAqi = null;
    let localAqiName = null;

    if (Array.isArray(json.indexes)) {
      for (const idx of json.indexes) {
        if (idx.code === 'uaqi') {
          uaqi = {
            aqi: idx.aqi,
            aqi_display: idx.aqiDisplay,
            category: idx.category,
            dominant_pollutant: idx.dominantPollutant,
          };
        }
        if (idx.code === 'aqi_in' || (!localAqi && idx.code !== 'uaqi')) {
          localAqi = {
            code: idx.code,
            displayName: idx.displayName,
            aqi: idx.aqi,
            aqi_display: idx.aqiDisplay,
            category: idx.category,
            dominant_pollutant: idx.dominantPollutant,
          };
          localAqiName = idx.displayName;
        }
      }
    }

    // Map pollutants
    const pollutants = {};
    if (Array.isArray(json.pollutants)) {
      for (const pol of json.pollutants) {
        const code = pol.code?.toLowerCase();
        if (code) {
          const val = pol.concentration?.value;
          const units = pol.concentration?.units;
          // Normalize unit label
          let unitLabel = units;
          if (units === 'MICROGRAMS_PER_CUBIC_METER') unitLabel = 'µg/m³';
          else if (units === 'PARTS_PER_BILLION') unitLabel = 'ppb';
          else if (units === 'PARTS_PER_MILLION') unitLabel = 'ppm';

          pollutants[code] = {
            value: typeof val === 'number' ? Number(val.toFixed(2)) : null,
            unit: unitLabel,
            raw_unit: units,
            display_name: pol.displayName || pol.fullName,
          };
        }
      }
    }

    const result = {
      available: true,
      status: 'success',
      provider: 'Google Air Quality API',
      data_type: 'modelled',
      data_type_label: 'Google Modelled / Spatial Interpolation',
      date_time: json.dateTime || new Date().toISOString(),
      region_code: json.regionCode || 'in',
      universal_aqi: uaqi,
      local_aqi: localAqi,
      pm25: pollutants.pm25?.value ?? null,
      pm10: pollutants.pm10?.value ?? null,
      no2: pollutants.no2?.value ?? null,
      so2: pollutants.so2?.value ?? null,
      co: pollutants.co?.value ?? null,
      o3: pollutants.o3?.value ?? null,
      pollutants,
      health_recommendations: json.healthRecommendations || null,
    };

    airQualityCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + AIR_QUALITY_CACHE_TTL_MS,
    });

    return result;
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        available: false,
        status: 'timeout',
        provider: 'Google Air Quality API',
        data_type: 'modelled',
        message: 'Google Air Quality API request timed out after 5000ms.',
      };
    }
    return {
      available: false,
      status: 'network_error',
      provider: 'Google Air Quality API',
      data_type: 'modelled',
      message: `Failed to connect to Google Air Quality API: ${err.message}`,
    };
  }
}
