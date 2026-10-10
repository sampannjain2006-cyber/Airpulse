-- ============================================================
-- AirPulse Database Schema Migration 003
-- 5-Day Machine Learning Forecasting Table
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
  CONSTRAINT uq_station_target_pred_date UNIQUE (station_id, target, prediction_date)
);

CREATE INDEX IF NOT EXISTS idx_predictions_station_date
  ON predictions (station_id, prediction_date);

CREATE INDEX IF NOT EXISTS idx_predictions_generated_at
  ON predictions (generated_at DESC);
