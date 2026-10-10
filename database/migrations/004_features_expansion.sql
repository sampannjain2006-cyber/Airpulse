-- ============================================================
-- AirPulse Database Schema Migration 004
-- Date-Based Data Selection & Multi-Model Unique Key Support
-- ============================================================

-- 1. Index on timezone-normalized date for fast historical date snapshot queries
CREATE INDEX IF NOT EXISTS idx_observations_recorded_date
  ON environmental_observations (CAST(recorded_at AT TIME ZONE 'Asia/Kolkata' AS date));

-- 2. Relax predictions unique constraint to include model_name
-- This preserves existing predictions and allows future multi-model comparison per date.
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS uq_station_target_pred_date;
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS uq_station_target_pred_model_date;
ALTER TABLE predictions ADD CONSTRAINT uq_station_target_pred_model_date
  UNIQUE (station_id, target, model_name, prediction_date);
