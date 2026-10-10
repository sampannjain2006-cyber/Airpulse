-- ============================================================
-- AirPulse Database
-- Migration 002: Phase 1 Core Environmental Data Schema
-- ============================================================
-- Tables:
--   monitoring_stations       — reference station registry
--   environmental_observations — pollutant readings per station
-- ============================================================

-- ============================================================
-- TABLE: monitoring_stations
-- ============================================================
CREATE TABLE IF NOT EXISTS monitoring_stations (
  id            SERIAL PRIMARY KEY,
  station_code  VARCHAR(64) UNIQUE NOT NULL,        -- unique identifier from source (e.g. OpenAQ location id)
  name          VARCHAR(255) NOT NULL,               -- human-readable station name
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  country       CHAR(2) NOT NULL DEFAULT 'IN',       -- ISO 3166-1 alpha-2; India default
  latitude      NUMERIC(9, 6) NOT NULL,
  longitude     NUMERIC(9, 6) NOT NULL,
  -- PostGIS geography point (lon, lat, SRID 4326)
  geog          GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
                  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                ) STORED,
  source_type   VARCHAR(32) NOT NULL DEFAULT 'cpcb'  -- 'cpcb' | 'openaq' | 'iot' | 'manual'
                CHECK (source_type IN ('cpcb', 'openaq', 'iot', 'manual')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index on geography column
CREATE INDEX IF NOT EXISTS idx_monitoring_stations_geog
  ON monitoring_stations USING GIST (geog);

-- Index for active station lookups
CREATE INDEX IF NOT EXISTS idx_monitoring_stations_active
  ON monitoring_stations (is_active);

-- Index for city/state filtering
CREATE INDEX IF NOT EXISTS idx_monitoring_stations_city
  ON monitoring_stations (city, state);

-- ============================================================
-- TABLE: environmental_observations
-- ============================================================
CREATE TABLE IF NOT EXISTS environmental_observations (
  id              BIGSERIAL PRIMARY KEY,
  station_id      INTEGER NOT NULL REFERENCES monitoring_stations (id) ON DELETE CASCADE,

  -- When the sensor actually recorded this measurement
  recorded_at     TIMESTAMPTZ NOT NULL,

  -- Air Quality Index (computed by provider if available)
  aqi             NUMERIC(6, 2),
  aqi_category    VARCHAR(32),                       -- 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe'

  -- Particulate matter (µg/m³)
  pm25            NUMERIC(8, 3),                     -- PM2.5
  pm10            NUMERIC(8, 3),                     -- PM10

  -- Gaseous pollutants (µg/m³)
  no2             NUMERIC(8, 3),                     -- Nitrogen dioxide
  so2             NUMERIC(8, 3),                     -- Sulphur dioxide
  co              NUMERIC(10, 3),                    -- Carbon monoxide (mg/m³ in CPCB)
  o3              NUMERIC(8, 3),                     -- Ozone

  -- Meteorological (may be null if provider doesn't supply)
  temperature     NUMERIC(6, 2),                     -- °C
  humidity        NUMERIC(5, 2),                     -- % relative humidity
  pressure        NUMERIC(8, 2),                     -- hPa

  -- Provenance (required by PROJECT_RULES.md)
  source          VARCHAR(64) NOT NULL,              -- e.g. 'openaq', 'cpcb_api', 'iot:device-001'
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),-- when this record was stored

  -- Idempotency: one observation per station per timestamp per source
  CONSTRAINT uq_observation UNIQUE (station_id, recorded_at, source)
);

-- Primary query index: station + time range lookups
CREATE INDEX IF NOT EXISTS idx_observations_station_time
  ON environmental_observations (station_id, recorded_at DESC);

-- Time-only index for global "latest" queries
CREATE INDEX IF NOT EXISTS idx_observations_recorded_at
  ON environmental_observations (recorded_at DESC);

-- Source attribution index
CREATE INDEX IF NOT EXISTS idx_observations_source
  ON environmental_observations (source);

-- ============================================================
-- Schema version marker
-- ============================================================
INSERT INTO system_info (key, value)
VALUES ('schema_version', '002_phase1_core_schema')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Verify tables were created
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN ('monitoring_stations', 'environmental_observations')
 ORDER BY table_name;
