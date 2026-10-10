-- ============================================================
-- AirPulse Database Schema Migration 005
-- OpenAQ Coverage Expansion & Nearby Search Support
-- ============================================================

-- 1. Extend monitoring_stations with OpenAQ v3 location metadata
ALTER TABLE monitoring_stations
  ADD COLUMN IF NOT EXISTS is_dashboard_station BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS openaq_location_id INTEGER,
  ADD COLUMN IF NOT EXISTS locality VARCHAR(255),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sensors_summary JSONB,
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ;

-- 2. Mark existing 40 stations as the primary dashboard display set
UPDATE monitoring_stations
SET is_dashboard_station = TRUE
WHERE id <= 40;

-- 3. Extract openaq_location_id for existing openaq stations
UPDATE monitoring_stations
SET openaq_location_id = CAST(NULLIF(regexp_replace(station_code, '^openaq-', ''), '') AS INTEGER)
WHERE station_code LIKE 'openaq-%' AND openaq_location_id IS NULL;

-- 4. Create indexes for efficient filtering and searching
CREATE INDEX IF NOT EXISTS idx_stations_is_dashboard ON monitoring_stations (is_dashboard_station);
CREATE INDEX IF NOT EXISTS idx_stations_openaq_location_id ON monitoring_stations (openaq_location_id);
CREATE INDEX IF NOT EXISTS idx_stations_locality ON monitoring_stations (locality);

-- 5. Update schema version marker
INSERT INTO system_info (key, value)
VALUES ('schema_version', '005_openaq_coverage_expansion')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
