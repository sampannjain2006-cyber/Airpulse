import { getPool } from '../config/db.js';

/**
 * Detect spatial pollution clusters from real OpenAQ ground observations on a specific date.
 *
 * @param {object} params
 * @param {string} params.dateStr - Date in YYYY-MM-DD format (Asia/Kolkata timezone)
 * @param {number} [params.threshold=60.0] - Minimum PM2.5 concentration (µg/m³) for station qualification
 * @param {number} [params.epsMeters=40000] - DBSCAN epsilon distance in meters (default 40km)
 * @param {number} [params.minStations=2] - Minimum number of distinct stations to form a regional cluster
 */
export async function findObservedHotspots({
  dateStr,
  threshold = 60.0,
  epsMeters = 40000,
  minStations = 2,
} = {}) {
  const pool = getPool();
  const thresh = Math.max(parseFloat(threshold) || 60.0, 10.0);
  const eps = Math.min(Math.max(parseInt(epsMeters, 10) || 40000, 5000), 200000); // 5km to 200km
  const minPts = Math.min(Math.max(parseInt(minStations, 10) || 2, 2), 20);

  const sql = `
    WITH qualifying_stations AS (
      -- Get latest observation per station on selected date satisfying PM2.5 threshold
      SELECT DISTINCT ON (s.id)
        s.id,
        s.station_code,
        s.name,
        s.city,
        s.state,
        s.latitude::float AS lat,
        s.longitude::float AS lon,
        s.geog,
        o.pm25::float AS pm25,
        o.recorded_at,
        o.source
      FROM environmental_observations o
      JOIN monitoring_stations s ON s.id = o.station_id
      WHERE CAST(o.recorded_at AT TIME ZONE 'Asia/Kolkata' AS date) = $1
        AND o.pm25 IS NOT NULL
        AND o.pm25 >= $2
        AND s.is_active = TRUE
      ORDER BY s.id, o.recorded_at DESC
    ),
    clustered AS (
      -- Apply PostGIS DBSCAN spatial clustering in Web Mercator metric projection (EPSG:3857)
      SELECT
        id, station_code, name, city, state, lat, lon, pm25, recorded_at, source, geog,
        ST_ClusterDBSCAN(ST_Transform(geog::geometry, 3857), eps := $3, minpoints := $4) OVER () AS cluster_id
      FROM qualifying_stations
    ),
    centroids AS (
      -- Calculate geographic centroid and convex hull geometry for valid clusters (excluding noise/cluster_id IS NULL)
      SELECT
        cluster_id,
        ST_Centroid(ST_Collect(geog::geometry)) AS centroid_geom,
        ST_ConvexHull(ST_Collect(geog::geometry)) AS hull_geom
      FROM clustered
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
    ),
    stations_with_dist AS (
      -- Measure distance from each station in cluster to the cluster centroid
      SELECT
        c.cluster_id,
        s.id, s.station_code, s.name, s.city, s.state, s.lat, s.lon, s.pm25, s.recorded_at, s.source,
        ST_Distance(s.geog, c.centroid_geom::geography) AS dist_to_centroid,
        c.centroid_geom,
        c.hull_geom
      FROM clustered s
      JOIN centroids c ON c.cluster_id = s.cluster_id
    )
    SELECT
      cluster_id,
      count(*)::int AS station_count,
      round(avg(pm25)::numeric, 1)::float AS avg_pm25,
      max(pm25)::float AS max_pm25,
      min(pm25)::float AS min_pm25,
      ST_Y(centroid_geom)::float AS center_lat,
      ST_X(centroid_geom)::float AS center_lon,
      round(max(dist_to_centroid)::numeric, 0)::float AS radius_meters,
      ST_AsGeoJSON(hull_geom) AS hull_geojson,
      json_agg(json_build_object(
        'station_id', id,
        'station_code', station_code,
        'name', name,
        'city', city,
        'state', state,
        'latitude', lat,
        'longitude', lon,
        'pm25', pm25,
        'recorded_at', recorded_at,
        'source', source,
        'dist_to_center_km', round((dist_to_centroid / 1000.0)::numeric, 1)::float
      ) ORDER BY pm25 DESC) AS stations
    FROM stations_with_dist
    GROUP BY cluster_id, centroid_geom, hull_geom
    ORDER BY avg_pm25 DESC;
  `;

  const { rows } = await pool.query(sql, [dateStr, thresh, eps, minPts]);
  return rows;
}

/**
 * Detect spatial pollution clusters from ML forecasts on a specific future date.
 *
 * @param {object} params
 * @param {string} params.dateStr - Target forecast date (YYYY-MM-DD)
 * @param {string} [params.modelName='weighted_ensemble'] - Prediction model
 * @param {number} [params.threshold=60.0] - Minimum predicted PM2.5 concentration (µg/m³)
 * @param {number} [params.epsMeters=40000] - DBSCAN epsilon distance in meters
 * @param {number} [params.minStations=2] - Minimum number of distinct stations
 */
export async function findForecastHotspots({
  dateStr,
  modelName = 'weighted_ensemble',
  threshold = 60.0,
  epsMeters = 40000,
  minStations = 2,
} = {}) {
  const pool = getPool();
  const thresh = Math.max(parseFloat(threshold) || 60.0, 10.0);
  const eps = Math.min(Math.max(parseInt(epsMeters, 10) || 40000, 5000), 200000);
  const minPts = Math.min(Math.max(parseInt(minStations, 10) || 2, 2), 20);

  const sql = `
    WITH qualifying_stations AS (
      -- Get predicted PM2.5 for selected model and date satisfying threshold
      SELECT
        s.id,
        s.station_code,
        s.name,
        s.city,
        s.state,
        s.latitude::float AS lat,
        s.longitude::float AS lon,
        s.geog,
        p.predicted_value::float AS pm25,
        p.lower_bound::float AS lower_bound,
        p.upper_bound::float AS upper_bound,
        p.model_name
      FROM predictions p
      JOIN monitoring_stations s ON s.id = p.station_id
      WHERE p.model_name = $1
        AND CAST(p.prediction_date AS date) = $2
        AND p.predicted_value IS NOT NULL
        AND p.predicted_value >= $3
        AND s.is_active = TRUE
    ),
    clustered AS (
      SELECT
        id, station_code, name, city, state, lat, lon, pm25, lower_bound, upper_bound, model_name, geog,
        ST_ClusterDBSCAN(ST_Transform(geog::geometry, 3857), eps := $4, minpoints := $5) OVER () AS cluster_id
      FROM qualifying_stations
    ),
    centroids AS (
      SELECT
        cluster_id,
        ST_Centroid(ST_Collect(geog::geometry)) AS centroid_geom,
        ST_ConvexHull(ST_Collect(geog::geometry)) AS hull_geom
      FROM clustered
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
    ),
    stations_with_dist AS (
      SELECT
        c.cluster_id,
        s.id, s.station_code, s.name, s.city, s.state, s.lat, s.lon, s.pm25, s.lower_bound, s.upper_bound, s.model_name,
        ST_Distance(s.geog, c.centroid_geom::geography) AS dist_to_centroid,
        c.centroid_geom,
        c.hull_geom
      FROM clustered s
      JOIN centroids c ON c.cluster_id = s.cluster_id
    )
    SELECT
      cluster_id,
      count(*)::int AS station_count,
      round(avg(pm25)::numeric, 1)::float AS avg_pm25,
      max(pm25)::float AS max_pm25,
      min(pm25)::float AS min_pm25,
      ST_Y(centroid_geom)::float AS center_lat,
      ST_X(centroid_geom)::float AS center_lon,
      round(max(dist_to_centroid)::numeric, 0)::float AS radius_meters,
      ST_AsGeoJSON(hull_geom) AS hull_geojson,
      json_agg(json_build_object(
        'station_id', id,
        'station_code', station_code,
        'name', name,
        'city', city,
        'state', state,
        'latitude', lat,
        'longitude', lon,
        'pm25', pm25,
        'lower_bound', lower_bound,
        'upper_bound', upper_bound,
        'model_name', model_name,
        'dist_to_center_km', round((dist_to_centroid / 1000.0)::numeric, 1)::float
      ) ORDER BY pm25 DESC) AS stations
    FROM stations_with_dist
    GROUP BY cluster_id, centroid_geom, hull_geom
    ORDER BY avg_pm25 DESC;
  `;

  const { rows } = await pool.query(sql, [modelName, dateStr, thresh, eps, minPts]);
  return rows;
}
