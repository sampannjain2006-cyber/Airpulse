/**
 * AIRPULSE — Campus Support TypeScript Interfaces (Feature 14)
 */

export type CampusRole = 'general_user' | 'student' | 'support_staff' | 'campus_admin';

export interface CampusInstitution {
  id: number;
  code: string;
  name: string;
  campus_type: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  reference_station?: string;
  approx_station_distance_km?: number;
  is_active: boolean;
}

export interface CampusEnvironmentalStatus {
  campus: {
    id: number;
    code: string;
    name: string;
    campus_type: string;
    city: string;
    state: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  reference_station: {
    id: number;
    name: string;
    distance_km: number;
  };
  data_provenance: {
    data_status: string;
    data_type: 'observed' | 'predicted' | 'modelled' | 'unavailable';
    source: string;
    recorded_at: string;
    is_stale: boolean;
    is_forecast: boolean;
    limitation_notice: string | null;
  };
  environmental_parameters: {
    pm25: number | null;
    pm10: number | null;
    unit: string;
    severity?: {
      status: string;
      metric: string;
      metric_display: string;
      value: number | null;
      unit: string;
      category: string;
      severity_level: number;
      color: string;
      bg_color: string;
      health_implication: string;
    };
  };
  matched_policy_tier?: {
    tier: number;
    tier_name: string;
    title: string;
    summary: string;
    recommended_actions: string[];
    permitted_accommodations: string[];
  } | null;
  precaution_guidance: Array<{
    id: string;
    title: string;
    explanation: string;
    priority: number;
    severity_category: string;
    disclaimer: string;
    source: {
      name: string;
      document: string;
      url: string;
    };
  }>;
  disclaimer: string;
}

export interface CampusPolicyRule {
  id: number;
  campus_id: number;
  policy_tier: number;
  tier_name: string;
  pollutant: string;
  threshold_min: number;
  threshold_max: number | null;
  title: string;
  summary: string;
  recommended_actions: string[];
  permitted_accommodations: string[];
  is_active: boolean;
  version: number;
  updated_at: string;
}

export interface PolicyEvaluationResult {
  campus_id: number | string;
  evaluated_at: string;
  evaluation_basis: {
    pollutant: string;
    value: number | null;
    severity_tier?: number;
    severity_category?: string;
    data_type: string;
    data_freshness_stale: boolean;
    reference_station: string;
    station_distance_km: number;
  };
  triggered_policy: {
    policy_tier?: number;
    tier_name?: string;
    title?: string;
    summary?: string;
    actions?: string[];
    accommodations?: string[];
  };
  privacy_conscious_matching: {
    active_consented_profiles_count: number;
    eligible_students_for_review_count: number;
    note: string;
  };
  proposed_response: {
    notice_title: string;
    advisory_text: string;
    recommended_target_group: string;
    accommodations_for_staff_review: string[];
    requires_human_approval: boolean;
    classes_automatically_cancelled: boolean;
    attendance_automatically_excused: boolean;
  };
  safety_advisory: string;
}

export interface StudentSupportProfile {
  id: number;
  campus_id: number;
  student_id_hash: string;
  display_name: string;
  academic_department: string;
  support_category: string;
  accommodation_preference: string;
  preferred_contact_channel: string;
  consent_status: 'active' | 'withdrawn';
  consent_version: string;
  consent_given_at: string;
  withdrawn_at: string | null;
  retention_months: number;
}

export interface CampusNotice {
  id: number;
  notice_code: string;
  campus_id: number;
  title: string;
  category: string;
  target_group: string;
  severity_tier: number;
  severity_category: string;
  environmental_context: {
    pollutant: string;
    value: number;
    unit: string;
    data_type?: string;
    source?: string;
    station_name?: string;
    recorded_at?: string;
    forecast_date?: string;
  };
  advisory_text: string;
  approved_accommodations: string[];
  status: 'draft' | 'under_review' | 'approved' | 'rejected';
  review_notes?: string | null;
  created_by_role: string;
  approved_by?: string | null;
  approved_at?: string | null;
  valid_from: string;
  valid_until: string;
  delivery_status: string;
  delivery_channel: string;
  delivery_provider_connected: boolean;
  disclaimer: string;
  created_at: string;
}

export interface AccommodationRequest {
  id: number;
  request_code: string;
  campus_id: number;
  student_profile_id: number;
  student_id_hash: string;
  course_code: string;
  accommodation_type: string;
  target_date: string;
  environmental_reason: string;
  status: 'submitted' | 'under_review' | 'approved' | 'declined';
  decision_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface CampusAuditLog {
  id: number;
  campus_id: number;
  actor_role: string;
  actor_id: string;
  action_type: string;
  target_entity_type: string;
  target_entity_id: string;
  summary: string;
  details_json: Record<string, unknown>;
  timestamp: string;
}

export interface CampusCatalogMetadata {
  status: string;
  support_categories: Array<{
    id: string;
    label: string;
    description: string;
    recommended_accommodations: string[];
  }>;
  accommodation_types: Array<{
    id: string;
    label: string;
    description: string;
    requires_approval: boolean;
  }>;
  disclaimer: string;
}
