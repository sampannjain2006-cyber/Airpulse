-- ============================================================================
-- AIRPULSE Migration 007: Feature 14 — Student Environmental Health & Campus Support
-- Privacy-conscious institutional decision-support schema
-- ============================================================================

-- 1. Campus Institutions
CREATE TABLE IF NOT EXISTS campus_institutions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  campus_type VARCHAR(50) DEFAULT 'university',
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  nearest_station_id INTEGER REFERENCES monitoring_stations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Campus Response Policies
CREATE TABLE IF NOT EXISTS campus_response_policies (
  id SERIAL PRIMARY KEY,
  campus_id INTEGER REFERENCES campus_institutions(id) ON DELETE CASCADE,
  policy_tier INTEGER NOT NULL,
  tier_name VARCHAR(50) NOT NULL,
  pollutant VARCHAR(20) DEFAULT 'pm25',
  threshold_min NUMERIC NOT NULL,
  threshold_max NUMERIC,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  permitted_accommodations JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Student Voluntary Support Profiles (Restricted Privacy)
CREATE TABLE IF NOT EXISTS campus_student_profiles (
  id SERIAL PRIMARY KEY,
  campus_id INTEGER REFERENCES campus_institutions(id) ON DELETE CASCADE,
  student_id_hash VARCHAR(64) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  academic_department VARCHAR(100) NOT NULL,
  support_category VARCHAR(60) NOT NULL,
  accommodation_preference VARCHAR(60) NOT NULL,
  preferred_contact_channel VARCHAR(50) DEFAULT 'campus_portal',
  consent_status VARCHAR(20) DEFAULT 'active',
  consent_version VARCHAR(20) DEFAULT 'v1.0',
  consent_given_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  retention_months INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Campus Environmental Notices (Draft, Review & Approval Workflow)
CREATE TABLE IF NOT EXISTS campus_environmental_notices (
  id SERIAL PRIMARY KEY,
  notice_code VARCHAR(50) UNIQUE NOT NULL,
  campus_id INTEGER REFERENCES campus_institutions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(60) NOT NULL,
  target_group VARCHAR(60) NOT NULL,
  severity_tier INTEGER NOT NULL,
  severity_category VARCHAR(50) NOT NULL,
  environmental_context JSONB NOT NULL,
  advisory_text TEXT NOT NULL,
  approved_accommodations JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(30) DEFAULT 'draft',
  review_notes TEXT,
  created_by_role VARCHAR(50) DEFAULT 'support_staff',
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  delivery_status VARCHAR(50) DEFAULT 'draft_not_sent',
  delivery_channel VARCHAR(50) DEFAULT 'campus_portal_preview',
  delivery_provider_connected BOOLEAN DEFAULT false,
  disclaimer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Academic Accommodation Requests
CREATE TABLE IF NOT EXISTS campus_accommodation_requests (
  id SERIAL PRIMARY KEY,
  request_code VARCHAR(50) UNIQUE NOT NULL,
  campus_id INTEGER REFERENCES campus_institutions(id) ON DELETE CASCADE,
  student_profile_id INTEGER REFERENCES campus_student_profiles(id) ON DELETE CASCADE,
  student_id_hash VARCHAR(64) NOT NULL,
  course_code VARCHAR(50) NOT NULL,
  accommodation_type VARCHAR(60) NOT NULL,
  target_date DATE NOT NULL,
  environmental_reason TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'submitted',
  decision_notes TEXT,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Institutional Audit Logs
CREATE TABLE IF NOT EXISTS campus_audit_logs (
  id SERIAL PRIMARY KEY,
  campus_id INTEGER REFERENCES campus_institutions(id) ON DELETE CASCADE,
  actor_role VARCHAR(50) NOT NULL,
  actor_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(60) NOT NULL,
  target_entity_type VARCHAR(50) NOT NULL,
  target_entity_id VARCHAR(100),
  summary TEXT NOT NULL,
  details_json JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(50) DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_campus_institutions_code ON campus_institutions(code);
CREATE INDEX IF NOT EXISTS idx_campus_policies_campus_tier ON campus_response_policies(campus_id, policy_tier);
CREATE INDEX IF NOT EXISTS idx_campus_students_campus_consent ON campus_student_profiles(campus_id, consent_status);
CREATE INDEX IF NOT EXISTS idx_campus_notices_campus_status ON campus_environmental_notices(campus_id, status);
CREATE INDEX IF NOT EXISTS idx_campus_accommodations_campus_status ON campus_accommodation_requests(campus_id, status);
CREATE INDEX IF NOT EXISTS idx_campus_audit_logs_campus_created ON campus_audit_logs(campus_id, created_at DESC);

-- Seed Initial Reference Campuses (India)
INSERT INTO campus_institutions (code, name, campus_type, city, state, latitude, longitude)
VALUES 
  ('IIT-DELHI', 'Indian Institute of Technology Delhi (Hauz Khas)', 'university', 'New Delhi', 'Delhi', 28.5450, 77.1926),
  ('DU-NORTH', 'Delhi University North Campus', 'university', 'Delhi', 'Delhi', 28.6890, 77.2100),
  ('IIT-BOMBAY', 'Indian Institute of Technology Bombay (Powai)', 'university', 'Mumbai', 'Maharashtra', 19.1334, 72.9133),
  ('JNU-DELHI', 'Jawaharlal Nehru University', 'university', 'New Delhi', 'Delhi', 28.5385, 77.1668),
  ('SRM-SONIPAT', 'SRM University Delhi-NCR, Sonepat (Rajiv Gandhi Education City)', 'university', 'Sonipat', 'Haryana', 28.9328, 77.0984)
ON CONFLICT (code) DO NOTHING;

-- Seed Default Institutional Response Policies for IIT-DELHI (Campus 1) based on CPCB NAQI guidelines
INSERT INTO campus_response_policies (campus_id, policy_tier, tier_name, pollutant, threshold_min, threshold_max, title, summary, recommended_actions, permitted_accommodations)
SELECT 
  c.id,
  1,
  'Satisfactory / Moderate',
  'pm25',
  60,
  90,
  'Campus Advisory: Moderate Environmental Conditions',
  'Routine campus operations continue. High-efficiency filtered indoor study spaces opened for voluntary use.',
  '["Routine campus operations", "Indoor filtered study spaces opened", "Voluntary exposure reduction advisory"]'::jsonb,
  '["Indoor facility relocation on request"]'::jsonb
FROM campus_institutions c WHERE c.code = 'IIT-DELHI'
ON CONFLICT DO NOTHING;

INSERT INTO campus_response_policies (campus_id, policy_tier, tier_name, pollutant, threshold_min, threshold_max, title, summary, recommended_actions, permitted_accommodations)
SELECT 
  c.id,
  2,
  'Poor',
  'pm25',
  91,
  120,
  'Tier 2 Protocol: Poor Environmental Air Quality',
  'Outdoor strenuous sports postponed. Disclosed respiratory-sensitive students eligible for recorded lesson review.',
  '["Outdoor athletics and sports practices moved indoors", "Ventilation system HEPA boost active", "Advisory posted to student portal"]'::jsonb,
  '["Recorded lecture access upon request", "Alternative tutorial slot"]'::jsonb
FROM campus_institutions c WHERE c.code = 'IIT-DELHI'
ON CONFLICT DO NOTHING;

INSERT INTO campus_response_policies (campus_id, policy_tier, tier_name, pollutant, threshold_min, threshold_max, title, summary, recommended_actions, permitted_accommodations)
SELECT 
  c.id,
  3,
  'Very Poor',
  'pm25',
  121,
  250,
  'Tier 3 Protocol: Very Poor Environmental Conditions',
  'Mandatory indoor physical activity relocation. Authorized faculty review alternative attendance and recorded lessons.',
  '["All outdoor student events postponed", "Air purifiers in high-traffic halls active", "Health & Support staff on standby"]'::jsonb,
  '["Recorded lecture access", "Alternative class slot", "Medical review of attendance considerations"]'::jsonb
FROM campus_institutions c WHERE c.code = 'IIT-DELHI'
ON CONFLICT DO NOTHING;

INSERT INTO campus_response_policies (campus_id, policy_tier, tier_name, pollutant, threshold_min, threshold_max, title, summary, recommended_actions, permitted_accommodations)
SELECT 
  c.id,
  4,
  'Severe',
  'pm25',
  251,
  999,
  'Tier 4 Protocol: Severe Atmospheric Emergency (CPCB NAQI > 400)',
  'Institutional crisis response. Hybrid lecture transmission enabled. Disclosed support students granted attendance consideration reviews.',
  '["Campus-wide emergency advisory issued", "Hybrid / remote lecture broadcast enabled where infrastructure permits", "Outdoor staff and student movements curtailed"]'::jsonb,
  '["Remote lecture participation", "Recorded lecture provision", "Formal attendance accommodation review"]'::jsonb
FROM campus_institutions c WHERE c.code = 'IIT-DELHI'
ON CONFLICT DO NOTHING;
