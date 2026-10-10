-- ============================================================
-- AirPulse Database Initialization
-- Migration 001: Enable PostGIS and create system health table
-- ============================================================

-- Enable PostGIS extension for geospatial support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create a minimal system_info table to verify database connectivity
-- This table is used by the Phase 0 health check endpoint.
CREATE TABLE IF NOT EXISTS system_info (
  id            SERIAL PRIMARY KEY,
  key           VARCHAR(100) UNIQUE NOT NULL,
  value         TEXT NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a version marker
INSERT INTO system_info (key, value)
VALUES ('schema_version', '001_init')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Verify PostGIS is working by selecting the version
-- This will fail if PostGIS is not properly installed,
-- which serves as an early detection mechanism.
SELECT PostGIS_Version();
