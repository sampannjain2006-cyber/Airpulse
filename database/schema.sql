-- ============================================================
-- AirPulse Database Schema Reference
-- ============================================================
-- This file contains the CURRENT cumulative schema.
-- It is a reference document — use migrations/ for actual changes.
--
-- Phase 0: system_info (health check)
-- Phase 1: monitoring_stations, environmental_observations
-- Phase 2: iot_devices, iot_readings, alerts (to be added)
-- Phase 3: predictions (to be added)
-- ============================================================

-- PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- System health check table (Phase 0)
CREATE TABLE IF NOT EXISTS system_info (
  id            SERIAL PRIMARY KEY,
  key           VARCHAR(100) UNIQUE NOT NULL,
  value         TEXT NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: monitoring_stations (Phase 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS monitoring_stations (
  id            SERIAL PRIMARY KEY,
  station_code  VARCHAR(64) UNIQUE NOT NULL,
  name          VARCHAR(255) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  country       CHAR(2) NOT NULL DEFAULT 'IN',
  latitude      NUMERIC(9, 6) NOT NULL,
  longitude     NUMERIC(9, 6) NOT NULL,
  geog          GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
                  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                ) STORED,
  source_type   VARCHAR(32) NOT NULL DEFAULT 'cpcb'
                CHECK (source_type IN ('cpcb', 'openaq', 'iot', 'manual')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_stations_geog
  ON monitoring_stations USING GIST (geog);

CREATE INDEX IF NOT EXISTS idx_monitoring_stations_active
  ON monitoring_stations (is_active);

CREATE INDEX IF NOT EXISTS idx_monitoring_stations_city
  ON monitoring_stations (city, state);

-- ============================================================
-- TABLE: environmental_observations (Phase 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS environmental_observations (
  id              BIGSERIAL PRIMARY KEY,
  station_id      INTEGER NOT NULL REFERENCES monitoring_stations (id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL,
  aqi             NUMERIC(6, 2),
  aqi_category    VARCHAR(32),
  pm25            NUMERIC(8, 3),
  pm10            NUMERIC(8, 3),
  no2             NUMERIC(8, 3),
  so2             NUMERIC(8, 3),
  co              NUMERIC(10, 3),
  o3              NUMERIC(8, 3),
  temperature     NUMERIC(6, 2),
  humidity        NUMERIC(5, 2),
  pressure        NUMERIC(8, 2),
  source          VARCHAR(64) NOT NULL,
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_observation UNIQUE (station_id, recorded_at, source)
);

CREATE INDEX IF NOT EXISTS idx_observations_station_time
  ON environmental_observations (station_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_observations_recorded_at
  ON environmental_observations (recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_observations_recorded_date
  ON environmental_observations (CAST(recorded_at AT TIME ZONE 'Asia/Kolkata' AS date));

-- ============================================================
-- TABLE: predictions (Phase 1 ML Forecasting Layer)
-- ============================================================
CREATE TABLE IF NOT EXISTS predictions (
  id               BIGSERIAL PRIMARY KEY,
  station_id       INTEGER NOT NULL REFERENCES monitoring_stations (id) ON DELETE CASCADE,
  target           VARCHAR(32) NOT NULL DEFAULT 'pm25',
  prediction_date  DATE NOT NULL,
  predicted_value  NUMERIC(8, 2) NOT NULL,
  lower_bound      NUMERIC(8, 2),
  upper_bound      NUMERIC(8, 2),
  model_name       VARCHAR(64) NOT NULL DEFAULT 'xgboost',
  model_version    VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  features_used    JSONB,
  metrics          JSONB,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_station_target_pred_model_date UNIQUE (station_id, target, model_name, prediction_date)
);

CREATE INDEX IF NOT EXISTS idx_predictions_station_date
  ON predictions (station_id, prediction_date);

CREATE INDEX IF NOT EXISTS idx_predictions_generated_at
  ON predictions (generated_at DESC);
