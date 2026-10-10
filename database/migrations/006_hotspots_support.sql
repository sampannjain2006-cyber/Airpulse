-- ============================================================
-- AirPulse Migration 006: Geospatial Hotspot Detection Support
-- Optimizes spatial clustering queries on predictions and observations
-- ============================================================

-- Index on predictions for fast date and model filtering during forecast clustering
CREATE INDEX IF NOT EXISTS idx_predictions_model_date
ON predictions (model_name, prediction_date);

-- Composite index on environmental_observations for PM2.5 filtering by date
CREATE INDEX IF NOT EXISTS idx_observations_date_pm25
ON environmental_observations (
  (CAST(recorded_at AT TIME ZONE 'Asia/Kolkata' AS date)),
  pm25
)
WHERE pm25 IS NOT NULL;

-- Update schema version
INSERT INTO system_info (key, value)
VALUES ('schema_version', '006_hotspots_support')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
