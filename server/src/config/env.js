import 'dotenv/config';

export const env = {
  NODE_ENV:       process.env.NODE_ENV || 'development',
  PORT:           parseInt(process.env.PORT, 10) || 3001,
  DATABASE_URL:   process.env.DATABASE_URL || '',
  CORS_ORIGIN:    process.env.CORS_ORIGIN || 'http://localhost:5173',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:5001',
  // External data providers (Phase 1+)
  OPENAQ_API_KEY: process.env.OPENAQ_API_KEY || '',
  // Google Services (Phase 6 & Feature 15)
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/google/auth/callback',
  // Location resolution and suitability thresholds
  OPENAQ_PROXIMITY_RADIUS_METERS: parseInt(process.env.OPENAQ_PROXIMITY_RADIUS_METERS, 10) || 25000,
  OPENAQ_FRESHNESS_HOURS: parseInt(process.env.OPENAQ_FRESHNESS_HOURS, 10) || 48,
  REFERENCE_OBSERVATION_TIME: process.env.REFERENCE_OBSERVATION_TIME || '2026-10-02T08:30:00.000Z',
};
