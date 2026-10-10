import { env } from '../config/env.js';
import { getPool } from '../config/db.js';
import { findNearbyStations } from '../models/stationModel.js';
import { resolveLocation, fetchAirQuality, isGoogleConfigured, getGoogleConfigStatus } from './googleService.js';
import { getSeverity } from '../utils/severityEngine.js';

/**
 * Format relative time in a human-readable manner.
 */
function getRelativeTimeStr(isoDate, refDate = new Date()) {
  if (!isoDate) return 'Unknown';
  const diffMs = refDate.getTime() - new Date(isoDate).getTime();
  if (diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * Unified Location Resolution & Air Quality Lookup Service.
 * Implements Feature 6: Google Location Resolution + OpenAQ Suitability + Fallback Flow.
 *
 * @param {object} params
 * @param {string} [params.query] - Place name or address
 * @param {number|string} [params.latitude] - Optional direct latitude
 * @param {number|string} [params.longitude] - Optional direct longitude
 * @param {number} [params.radiusMeters] - Configurable proximity threshold (default: 25000m / 25km)
 * @param {number} [params.freshnessHours] - Configurable freshness threshold (default: 48h)
 * @param {string} [params.referenceTime] - Baseline reference time for freshness evaluation
 */
export async function lookupLocationAirQuality({
  query,
  latitude,
  longitude,
  radiusMeters = env.OPENAQ_PROXIMITY_RADIUS_METERS,
  freshnessHours = env.OPENAQ_FRESHNESS_HOURS,
  referenceTime = env.REFERENCE_OBSERVATION_TIME,
} = {}) {
  const radius = Math.min(Math.max(parseInt(radiusMeters, 10) || 25000, 500), 100000); // 500m to 100km
  const freshness = Math.min(Math.max(parseInt(freshnessHours, 10) || 48, 1), 720);     // 1h to 30 days
  const refDate = referenceTime ? new Date(referenceTime) : new Date();

  // STEP 1: Location Resolution
  let resolvedLocation = null;

  if (latitude !== undefined && longitude !== undefined && latitude !== '' && longitude !== '') {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      const err = new Error(`Invalid geographic coordinates: lat=${latitude}, lon=${longitude}`);
      err.statusCode = 400;
      throw err;
    }
    resolvedLocation = {
      found: true,
      canonical_name: query || `Coordinates (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`,
      city: query || 'Specified Coordinates',
      state: 'India',
      country: 'India',
      latitude: lat,
      longitude: lon,
      resolution_source: 'direct_coordinates',
    };
  } else if (query && typeof query === 'string' && query.trim() !== '') {
    resolvedLocation = await resolveLocation(query.trim());
    if (!resolvedLocation.found) {
      return {
        status: 'location_not_found',
        message: resolvedLocation.error || `Could not resolve location: '${query}'`,
        query,
        criteria: {
          proximity_radius_km: radius / 1000,
          freshness_hours: freshness,
          reference_time: refDate.toISOString(),
        },
        primary_reading: null,
        openaq_status: { suitable: false, nearby_stations_count: 0, reason: 'Location could not be resolved.' },
        google_status: getGoogleConfigStatus(),
        nearby_openaq_reference: [],
      };
    }
  } else {
    const err = new Error("Either 'query' or ('latitude' and 'longitude') must be provided.");
    err.statusCode = 400;
    throw err;
  }

  const { latitude: targetLat, longitude: targetLon } = resolvedLocation;

  // STEP 2: PostGIS Search on 764 OpenAQ Monitoring Stations
  const nearbyStations = await findNearbyStations({
    latitude: targetLat,
    longitude: targetLon,
    radiusMeters: radius,
    limit: 10,
  });

  // STEP 3: Query Observations and Evaluate OpenAQ Suitability
  const pool = getPool();
  let observationsByStation = new Map();

  if (nearbyStations.length > 0 && pool) {
    const stationIds = nearbyStations.map((s) => s.id);
    const obsSql = `
      SELECT DISTINCT ON (station_id)
        id, station_id, recorded_at, aqi, aqi_category,
        pm25::float AS pm25, pm10::float AS pm10, no2::float AS no2,
        so2::float AS so2, co::float AS co, o3::float AS o3,
        temperature::float AS temperature, humidity::float AS humidity,
        source, ingested_at
      FROM environmental_observations
      WHERE station_id = ANY($1::int[])
      ORDER BY station_id, recorded_at DESC;
    `;
    const obsRes = await pool.query(obsSql, [stationIds]);
    for (const r of obsRes.rows) {
      observationsByStation.set(r.station_id, r);
    }
  }

  // Check which nearby station has suitable and sufficiently fresh observations
  let suitableStation = null;
  let suitableObservation = null;

  for (const st of nearbyStations) {
    const obs = observationsByStation.get(st.id);
    if (!obs) continue;

    // Check pollutant presence (PM2.5 or AQI)
    const hasPollutant = obs.pm25 !== null && isFinite(obs.pm25);
    if (!hasPollutant) continue;

    // Check freshness relative to reference time
    const obsTime = new Date(obs.recorded_at);
    const ageHours = (refDate.getTime() - obsTime.getTime()) / (1000 * 60 * 60);

    if (ageHours >= 0 && ageHours <= freshness) {
      suitableStation = st;
      suitableObservation = {
        ...obs,
        age_hours: Math.round(ageHours * 10) / 10,
      };
      break; // Found closest suitable station
    }
  }

  // Compile nearby OpenAQ reference list (even if observations are stale or missing)
  const nearbyOpenAQReference = nearbyStations.map((st) => {
    const obs = observationsByStation.get(st.id);
    const distKm = Math.round((st.distance_meters / 1000) * 10) / 10;
    return {
      station_id: st.id,
      station_code: st.station_code,
      name: st.name,
      city: st.city,
      state: st.state,
      latitude: st.latitude,
      longitude: st.longitude,
      distance_km: distKm,
      is_dashboard_station: st.is_dashboard_station,
      sensors: st.sensors_summary || [],
      last_updated_at: st.last_updated_at,
      has_observation: Boolean(obs),
      last_observed_at: obs ? obs.recorded_at : null,
      last_pm25: obs ? obs.pm25 : null,
    };
  });

  // STEP 4: Provider Selection Flow
  let primaryReading = null;
  let openaqStatus = null;
  let googleStatus = null;

  if (suitableStation && suitableObservation) {
    // SCENARIO 1: Suitable OpenAQ Ground Station Observation Found
    const distKm = Math.round((suitableStation.distance_meters / 1000) * 10) / 10;
    const severity = getSeverity('pm25', suitableObservation.pm25, false);

    primaryReading = {
      provider: 'OpenAQ Ground Station',
      provider_code: 'openaq',
      data_type: 'observed',
      data_type_label: 'Ground Measured Observation',
      metric: 'pm25',
      pm25: suitableObservation.pm25,
      pm10: suitableObservation.pm10,
      no2: suitableObservation.no2,
      so2: suitableObservation.so2,
      co: suitableObservation.co,
      o3: suitableObservation.o3,
      temperature: suitableObservation.temperature,
      humidity: suitableObservation.humidity,
      aqi: suitableObservation.aqi,
      timestamp: suitableObservation.recorded_at,
      freshness_text: `${suitableObservation.age_hours}h ago (${getRelativeTimeStr(suitableObservation.recorded_at, refDate)})`,
      is_stale: false,
      severity,
      station_info: {
        id: suitableStation.id,
        station_code: suitableStation.station_code,
        name: suitableStation.name,
        city: suitableStation.city,
        state: suitableStation.state,
        distance_km: distKm,
      },
    };

    openaqStatus = {
      suitable: true,
      nearby_stations_count: nearbyStations.length,
      selected_station: suitableStation.name,
      distance_km: distKm,
      observation_age_hours: suitableObservation.age_hours,
      reason: `Found active OpenAQ ground station '${suitableStation.name}' ${distKm} km away with fresh telemetry (${suitableObservation.age_hours}h old).`,
    };

    // If Google is configured, we can optionally fetch Google data as additional context
    if (isGoogleConfigured()) {
      const gRes = await fetchAirQuality(targetLat, targetLon);
      googleStatus = {
        configured: true,
        status: gRes.status,
        data: gRes.available ? gRes : null,
        message: 'Google Air Quality retrieved as secondary context.',
      };
    } else {
      googleStatus = {
        configured: false,
        status: 'unconfigured',
        message: 'Google Air Quality API key not configured (not required when suitable OpenAQ ground data exists).',
      };
    }

  } else {
    // SCENARIO 2: OpenAQ Observation Unavailable or Stale -> Query Google Air Quality API
    const openaqReason = nearbyStations.length === 0
      ? `No OpenAQ monitoring stations found within the ${radius / 1000} km proximity radius.`
      : `Found ${nearbyStations.length} nearby OpenAQ station(s), but none had measurements recorded within the last ${freshness} hours matching the requested pollutant criteria.`;

    openaqStatus = {
      suitable: false,
      nearby_stations_count: nearbyStations.length,
      closest_station: nearbyStations[0] ? {
        name: nearbyStations[0].name,
        distance_km: Math.round((nearbyStations[0].distance_meters / 1000) * 10) / 10,
        last_updated_at: nearbyStations[0].last_updated_at,
      } : null,
      reason: openaqReason,
    };

    // Query Google Air Quality API
    const googleRes = await fetchAirQuality(targetLat, targetLon);
    googleStatus = {
      configured: isGoogleConfigured(),
      status: googleRes.status,
      message: googleRes.message || (googleRes.available ? 'Air quality retrieved from Google model.' : 'Google data unavailable.'),
      data: googleRes.available ? googleRes : null,
    };

    if (googleRes.available && googleRes.pm25 !== null) {
      // Google succeeded with PM2.5 concentration
      const severity = getSeverity('pm25', googleRes.pm25, false);

      primaryReading = {
        provider: 'Google Air Quality API',
        provider_code: 'google',
        data_type: 'modelled',
        data_type_label: 'Google Modelled / Spatial Interpolation',
        metric: 'pm25',
        pm25: googleRes.pm25,
        pm10: googleRes.pm10,
        no2: googleRes.no2,
        so2: googleRes.so2,
        co: googleRes.co,
        o3: googleRes.o3,
        temperature: null,
        humidity: null,
        aqi: googleRes.local_aqi?.aqi ?? googleRes.universal_aqi?.aqi ?? null,
        aqi_name: googleRes.local_aqi?.displayName ?? 'Universal AQI',
        timestamp: googleRes.date_time,
        freshness_text: getRelativeTimeStr(googleRes.date_time, refDate),
        is_stale: false,
        severity,
        universal_aqi: googleRes.universal_aqi,
        local_aqi: googleRes.local_aqi,
        health_recommendations: googleRes.health_recommendations,
        station_info: null, // Note: Google is not a physical monitoring station
      };
    } else {
      // Both OpenAQ and Google unavailable
      primaryReading = null;
    }
  }

  return {
    status: primaryReading ? 'success' : 'unavailable',
    location: resolvedLocation,
    criteria: {
      proximity_radius_km: radius / 1000,
      freshness_hours: freshness,
      reference_time: refDate.toISOString(),
      standard: 'CPCB NAQI Standard (2014) for severity evaluation',
    },
    primary_reading: primaryReading,
    openaq_status: openaqStatus,
    google_status: googleStatus,
    nearby_openaq_reference: nearbyOpenAQReference,
  };
}
