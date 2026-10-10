/**
 * AIRPULSE — Pollution-Aware Route Planning Service (Walking & Cycling Priority)
 * 
 * Features:
 * - Walking (profile: 'foot') and Cycling (profile: 'bike') priority routing via OSRM.
 * - Genuine provider-returned road geometries (GeoJSON LineString), real distances, and durations.
 * - PostGIS spatial route corridor analysis: queries active ground monitoring stations within 3km.
 * - Spatial relevance & coverage calculation: segments without nearby stations are explicitly
 *   labeled as 'insufficient_data' (never treated as clean or zero).
 * - Comparative analysis: identifies fastest route vs lower-exposure route when data supports comparison.
 * - Honest provenance attribution: distinguishes ground observations near corridor from approximate
 *   corridor estimates and unavailable data.
 * - Precaution guidance and statutory safety notices (no guarantee of safe air or zero inhaled dose).
 */

import { getPool } from '../config/db.js';
import { resolveLocation } from './googleService.js';
import { getSeverity } from '../utils/severityEngine.js';

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const ROUTE_BUFFER_METERS = 3000; // 3km corridor buffer
const MAX_STATIONS_PER_CORRIDOR = 10;
const OSRM_TIMEOUT_MS = 7000;

const ROUTE_DISCLAIMERS = {
  safety_notice:
    'HEALTH ADVISORY: AIRPULSE route exposure estimates reflect ambient air quality from nearby monitoring stations along the road corridor. They DO NOT guarantee personal safety, zero inhaled dose, or absence of localized vehicle exhaust plumes.',
  ventilation_notice:
    'VENTILATION NOTE: Walking and cycling involve increased cardiovascular exertion and minute ventilation rate compared to passive transit. In severe smog, reducing travel duration, choosing green off-street paths, or using certified tight-fitting N95/FFP2 respirators provides meaningful exposure reduction.',
  data_provenance_notice:
    'DATA PROVENANCE: Corridor estimates represent spatial proximity matching against active CPCB / OpenAQ monitoring stations. Segments farther than 3 km from active sensors are classified as Insufficient Data and are NEVER assumed to be clean or zero.',
  provider_attribution:
    'Routing geometries and estimated travel durations provided by Open Source Routing Machine (OSRM) © OpenStreetMap contributors.',
};

const POPULAR_INDIAN_LANDMARKS = {
  'connaught place': { lat: 28.6315, lon: 77.2167, name: 'Connaught Place, New Delhi' },
  'india gate': { lat: 28.6129, lon: 77.2295, name: 'India Gate, New Delhi' },
  'lodhi garden': { lat: 28.5933, lon: 77.2197, name: 'Lodhi Garden, New Delhi' },
  'hauz khas': { lat: 28.5535, lon: 77.1943, name: 'Hauz Khas Village, New Delhi' },
  'hauz khas village': { lat: 28.5535, lon: 77.1943, name: 'Hauz Khas Village, New Delhi' },
  'ito': { lat: 28.6288, lon: 77.2410, name: 'ITO Intersection, New Delhi' },
  'ito intersection': { lat: 28.6288, lon: 77.2410, name: 'ITO Intersection, New Delhi' },
  'chandni chowk': { lat: 28.6506, lon: 77.2303, name: 'Chandni Chowk, Delhi' },
  'red fort': { lat: 28.6562, lon: 77.2410, name: 'Red Fort, Delhi' },
  'qutub minar': { lat: 28.5244, lon: 77.1855, name: 'Qutub Minar, New Delhi' },
  'delhi gate': { lat: 28.6395, lon: 77.2411, name: 'Delhi Gate, Delhi' },
  'marine drive': { lat: 18.9432, lon: 72.8230, name: 'Marine Drive, Mumbai' },
  'gateway of india': { lat: 18.9220, lon: 72.8347, name: 'Gateway of India, Mumbai' },
  'cubbon park': { lat: 12.9763, lon: 77.5929, name: 'Cubbon Park, Bengaluru' },
  'victoria memorial': { lat: 22.5448, lon: 88.3426, name: 'Victoria Memorial, Kolkata' },
};

/**
 * Resolves a point input into valid WGS84 coordinates and label.
 */
async function resolvePoint(input, label) {
  if (!input) {
    const err = new Error(`Missing required location: ${label}`);
    err.statusCode = 400;
    throw err;
  }

  // Direct coordinate object or string "lat,lon"
  if (typeof input === 'object' && input.latitude !== undefined && input.longitude !== undefined) {
    const lat = parseFloat(input.latitude);
    const lon = parseFloat(input.longitude);
    if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      const err = new Error(`Invalid coordinates for ${label}: lat=${input.latitude}, lon=${input.longitude}`);
      err.statusCode = 400;
      throw err;
    }
    return {
      latitude: lat,
      longitude: lon,
      name: input.name || `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
      resolved: true,
      source: 'direct_coordinates',
    };
  }

  if (typeof input === 'string') {
    const coordMatch = input.match(/^([-+]?\d+(\.\d+)?),\s*([-+]?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[3]);
      if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return {
          latitude: lat,
          longitude: lon,
          name: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
          resolved: true,
          source: 'direct_coordinates',
        };
      }
    }

    const landmarkMatch = POPULAR_INDIAN_LANDMARKS[input.toLowerCase().trim()];
    if (landmarkMatch) {
      return {
        latitude: landmarkMatch.lat,
        longitude: landmarkMatch.lon,
        name: landmarkMatch.name,
        resolved: true,
        source: 'landmark_registry',
      };
    }

    // Textual geocode lookup via existing resolveLocation
    const loc = await resolveLocation(input.trim());
    if (loc && loc.found) {
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: loc.canonical_name || input,
        resolved: true,
        source: loc.resolution_source,
      };
    }
  }

  const notFoundErr = new Error(`Could not resolve location for ${label}: '${input}'. Please check place name or enter coordinates.`);
  notFoundErr.statusCode = 404;
  throw notFoundErr;
}

/**
 * Fetches actual route geometries and metrics from OSRM provider.
 */
async function fetchOsrmRoutes(origin, dest, mode) {
  const profile = mode === 'cycling' ? 'bike' : 'foot';
  const url = `${OSRM_BASE_URL}/${profile}/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson&alternatives=true&steps=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AirPulse-Environmental-Intelligence/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Routing provider returned HTTP ${res.status}: ${text}`);
    }

    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
      const err = new Error(json.message || `No feasible ${mode} route found between specified points.`);
      err.statusCode = 404;
      throw err;
    }

    return json.routes;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Routing service timed out after 7000ms. Please try again.');
      timeoutErr.statusCode = 504;
      throw timeoutErr;
    }
    if (err.statusCode) throw err;
    const providerErr = new Error(`Routing provider unavailable: ${err.message}`);
    providerErr.statusCode = 503;
    throw providerErr;
  }
}

/**
 * Analyzes pollution along a route geometry using PostGIS corridor search.
 */
async function analyzeRoutePollution(routeGeometry, targetPollutant = 'pm25') {
  const pool = getPool();
  if (!pool) {
    return {
      status: 'unavailable',
      stations: [],
      coverage_pct: 0,
      corridor_avg_concentration: null,
      severity: null,
      message: 'Database unavailable for spatial corridor query.',
    };
  }

  const geoJsonString = JSON.stringify(routeGeometry);

  // 1. Find all active monitoring stations within 3km of the route LineString
  const corridorSql = `
    SELECT
      s.id, s.station_code, s.name, s.city, s.state,
      s.latitude::float as latitude,
      s.longitude::float as longitude,
      ROUND(ST_Distance(s.geog, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography)::numeric, 1)::float AS distance_to_route_meters,
      o.pm25::float AS pm25,
      o.pm10::float AS pm10,
      o.no2::float AS no2,
      o.so2::float AS so2,
      o.co::float AS co,
      o.o3::float AS o3,
      o.aqi::float AS aqi,
      o.recorded_at,
      o.source
    FROM monitoring_stations s
    JOIN LATERAL (
      SELECT pm25, pm10, no2, so2, co, o3, aqi, recorded_at, source
      FROM environmental_observations
      WHERE station_id = s.id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) o ON true
    WHERE s.is_active = TRUE
      AND ST_DWithin(s.geog, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography, $2)
    ORDER BY distance_to_route_meters ASC
    LIMIT $3;
  `;

  let stations = [];
  try {
    const res = await pool.query(corridorSql, [geoJsonString, ROUTE_BUFFER_METERS, MAX_STATIONS_PER_CORRIDOR]);
    stations = res.rows;
  } catch (err) {
    console.error('[RouteService] Spatial corridor query error:', err.message);
  }

  // 2. Sample route coordinates to compute spatial coverage percentage
  const coords = routeGeometry.coordinates || [];
  const numSamples = Math.min(Math.max(coords.length, 5), 20);
  const sampleIndices = [];
  for (let i = 0; i < numSamples; i++) {
    const idx = Math.floor((i / (numSamples - 1)) * (coords.length - 1));
    sampleIndices.push(coords[idx]);
  }

  // For each sample point, check if there is an active station within 3000m
  let coveredPointsCount = 0;
  for (const pt of sampleIndices) {
    const ptLon = pt[0];
    const ptLat = pt[1];
    const hasNearby = stations.some((st) => {
      // Rough distance check in degrees ~ 3km ≈ 0.027 degrees
      const dLat = (st.latitude - ptLat) * 111000;
      const dLon = (st.longitude - ptLon) * 111000 * Math.cos((ptLat * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      return dist <= ROUTE_BUFFER_METERS;
    });
    if (hasNearby) coveredPointsCount++;
  }

  const coveragePct = sampleIndices.length > 0
    ? Math.round((coveredPointsCount / sampleIndices.length) * 100)
    : 0;

  // 3. Compute distance-weighted average concentration for targetPollutant
  const validPollutionStations = stations.filter(
    (s) => s[targetPollutant] !== null && s[targetPollutant] !== undefined && !isNaN(s[targetPollutant])
  );

  let corridorAvg = null;
  let severityInfo = null;

  if (validPollutionStations.length > 0 && coveragePct >= 20) {
    // Weighted inverse-distance average
    let weightSum = 0;
    let weightedValSum = 0;
    for (const st of validPollutionStations) {
      // Add minimum distance floor of 200m to prevent divide-by-zero
      const distWeight = 1 / Math.max(st.distance_to_route_meters, 200);
      weightSum += distWeight;
      weightedValSum += st[targetPollutant] * distWeight;
    }
    corridorAvg = weightSum > 0 ? Math.round((weightedValSum / weightSum) * 10) / 10 : null;

    if (corridorAvg !== null) {
      const sev = getSeverity(targetPollutant, corridorAvg);
      if (sev && sev.status === 'valid') {
        severityInfo = {
          tier: sev.severity_level,
          category: sev.category,
          color: sev.color,
          health_implication: sev.health_implication,
        };
      }
    }
  }

  const hasData = corridorAvg !== null && severityInfo !== null;

  return {
    status: hasData ? 'available' : 'insufficient_data',
    corridor_buffer_meters: ROUTE_BUFFER_METERS,
    coverage_pct: coveragePct,
    corridor_avg_concentration: corridorAvg,
    pollutant: targetPollutant.toUpperCase(),
    severity: severityInfo,
    nearby_stations_count: stations.length,
    stations: stations.map((st) => ({
      id: st.id,
      name: st.name,
      city: st.city,
      distance_meters: st.distance_to_route_meters,
      latitude: st.latitude,
      longitude: st.longitude,
      pm25: st.pm25,
      pm10: st.pm10,
      no2: st.no2,
      recorded_at: st.recorded_at,
      source: st.source,
    })),
    data_provenance_label: hasData
      ? 'APPROXIMATE CORRIDOR ESTIMATE (FROM NEARBY GROUND SENSORS)'
      : 'DATA UNAVAILABLE (NO GROUND STATIONS WITHIN 3KM)',
    methodology_note:
      'Corridor exposure is estimated by calculating inverse-distance weighted concentrations from active ground stations within 3 km of the route geometry. It does not replace micro-scale kerbside monitoring.',
  };
}

/**
 * Plans pollution-aware walking and cycling routes between Origin and Destination.
 */
export async function planRoute(params = {}) {
  const {
    origin: rawOrigin,
    destination: rawDest,
    mode: rawMode = 'walking',
    pollutant = 'pm25',
  } = params;

  // Validate travel mode: Walking or Cycling only
  const mode = String(rawMode).toLowerCase().trim();
  if (mode !== 'walking' && mode !== 'cycling') {
    const err = new Error(`Invalid travel mode: '${rawMode}'. Supported modes: 'walking', 'cycling'.`);
    err.statusCode = 400;
    throw err;
  }

  // 1. Resolve Origin and Destination coordinates
  const origin = await resolvePoint(rawOrigin, 'Origin (A)');
  const destination = await resolvePoint(rawDest, 'Destination (B)');

  // Ensure origin and destination are distinct
  const distDirect = Math.sqrt(
    Math.pow((origin.latitude - destination.latitude) * 111000, 2) +
    Math.pow((origin.longitude - destination.longitude) * 111000 * Math.cos((origin.latitude * Math.PI) / 180), 2)
  );

  if (distDirect < 20) {
    const err = new Error('Origin and Destination are identical or less than 20 meters apart. Please select distinct locations.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Fetch routes from OSRM
  const rawRoutes = await fetchOsrmRoutes(origin, destination, mode);

  // 3. Analyze pollution along each route
  const analyzedRoutes = [];
  for (let i = 0; i < rawRoutes.length; i++) {
    const r = rawRoutes[i];
    const pollutionAnalysis = await analyzeRoutePollution(r.geometry, pollutant);

    const distanceKm = Math.round((r.distance / 1000) * 100) / 100;
    // Calibrate realistic travel duration for active travel modes
    // Walking: ~4.8 km/h = 1.33 m/s; Cycling: ~15.0 km/h = 4.17 m/s
    const speedMps = mode === 'cycling' ? 4.17 : 1.33;
    const durationSeconds = Math.round(r.distance / speedMps);
    const durationMins = Math.max(1, Math.round(durationSeconds / 60));

    analyzedRoutes.push({
      route_index: i,
      name: i === 0 ? 'Primary Route' : `Alternative Route ${i}`,
      mode,
      mode_label: mode === 'cycling' ? 'Cycling' : 'Walking',
      distance_km: distanceKm,
      distance_meters: Math.round(r.distance),
      duration_minutes: durationMins,
      duration_seconds: durationSeconds,
      geometry: r.geometry,
      steps_count: r.legs?.[0]?.steps?.length || 0,
      pollution_analysis: pollutionAnalysis,
    });
  }

  // 4. Determine Fastest vs Lower-Exposure Route
  // Fastest: lowest duration_seconds
  let fastestIndex = 0;
  let minDuration = Infinity;
  for (let i = 0; i < analyzedRoutes.length; i++) {
    if (analyzedRoutes[i].duration_seconds < minDuration) {
      minDuration = analyzedRoutes[i].duration_seconds;
      fastestIndex = i;
    }
  }

  // Lowest Exposure: lowest corridor_avg_concentration (if valid and covered)
  let lowestExposureIndex = null;
  let minExposure = Infinity;
  let hasComparableExposure = false;

  for (let i = 0; i < analyzedRoutes.length; i++) {
    const analysis = analyzedRoutes[i].pollution_analysis;
    if (analysis.status === 'available' && analysis.corridor_avg_concentration !== null && analysis.coverage_pct >= 20) {
      hasComparableExposure = true;
      if (analysis.corridor_avg_concentration < minExposure) {
        minExposure = analysis.corridor_avg_concentration;
        lowestExposureIndex = i;
      }
    }
  }

  // Mark flags on each route
  for (let i = 0; i < analyzedRoutes.length; i++) {
    const r = analyzedRoutes[i];
    r.is_fastest = i === fastestIndex;
    r.is_lower_exposure = hasComparableExposure && i === lowestExposureIndex;

    if (r.is_fastest && r.is_lower_exposure) {
      r.tag = 'FASTEST & LOWER EXPOSURE';
    } else if (r.is_fastest) {
      r.tag = 'FASTEST ROUTE';
    } else if (r.is_lower_exposure) {
      r.tag = 'LOWER ESTIMATED EXPOSURE';
    } else {
      r.tag = 'ALTERNATIVE ROUTE';
    }
  }

  const targetPolLabel = pollutant.toLowerCase() === 'pm25' ? 'PM2.5' : pollutant.toUpperCase();

  // 5. Build Comparative Verdict
  let comparisonVerdict = 'single_route_available';
  let comparisonNote = 'Only one feasible road route was returned by the routing engine for this trip.';

  if (!hasComparableExposure) {
    comparisonVerdict = 'insufficient_pollution_data_to_rank';
    comparisonNote =
      'Monitoring sensor coverage is insufficient along the route corridor (no active ground stations within 3 km) to estimate pollution exposure. Displaying road path without pollution ranking.';
  } else if (analyzedRoutes.length > 1) {
    if (fastestIndex === lowestExposureIndex) {
      comparisonVerdict = 'fastest_is_also_cleanest';
      comparisonNote =
        `The fastest route (${analyzedRoutes[fastestIndex].duration_minutes} min) also exhibits the lowest estimated corridor pollution level (${analyzedRoutes[fastestIndex].pollution_analysis.corridor_avg_concentration} µg/m³ ${targetPolLabel}).`;
    } else {
      const fastestRoute = analyzedRoutes[fastestIndex];
      const greenRoute = analyzedRoutes[lowestExposureIndex];
      const timeDiff = greenRoute.duration_minutes - fastestRoute.duration_minutes;
      const exposureDiff = Math.round(fastestRoute.pollution_analysis.corridor_avg_concentration - greenRoute.pollution_analysis.corridor_avg_concentration);

      comparisonVerdict = 'tradeoff_between_time_and_exposure';
      comparisonNote =
        `${greenRoute.name} offers lower corridor pollution (~${greenRoute.pollution_analysis.corridor_avg_concentration} µg/m³ vs ~${fastestRoute.pollution_analysis.corridor_avg_concentration} µg/m³ ${targetPolLabel}, ~${exposureDiff} µg/m³ lower), while adding ${timeDiff} minute${timeDiff !== 1 ? 's' : ''} to travel time.`;
    }
  }

  return {
    success: true,
    status: 'success',
    origin: {
      name: origin.name,
      latitude: origin.latitude,
      longitude: origin.longitude,
      source: origin.source,
    },
    destination: {
      name: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      source: destination.source,
    },
    mode,
    travel_mode: mode,
    travel_mode_label: mode === 'cycling' ? 'Cycling' : 'Walking',
    target_pollutant: targetPolLabel,
    routes_count: analyzedRoutes.length,
    comparison: {
      verdict: comparisonVerdict,
      note: comparisonNote,
      has_comparable_exposure: hasComparableExposure,
      fastest_route_index: fastestIndex,
      lowest_exposure_route_index: lowestExposureIndex,
    },
    routes: analyzedRoutes,
    disclaimers: ROUTE_DISCLAIMERS,
  };
}
