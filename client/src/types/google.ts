/**
 * AIRPULSE — Google Services Integration Types (Feature 15)
 */

export interface GoogleServiceStatus {
  maps: {
    feature: string;
    status: string;
    directions_supported: boolean;
    travel_modes: string[];
    paid_api_required: boolean;
    api_key_configured: boolean;
    limitation_notice: string;
  };
  calendar: {
    feature: string;
    status: string;
    url_draft_supported: boolean;
    ics_download_supported: boolean;
    oauth_required: boolean;
    supports_provenance: boolean;
    privacy_guarantee: string;
  };
  tasks: {
    feature: string;
    status: string;
    direct_api_configured: boolean;
    web_draft_supported: boolean;
    clipboard_checklist_supported: boolean;
    fallback_notice: string;
  };
  oauth: {
    configured: boolean;
    client_id_configured: boolean;
    client_secret_configured: boolean;
    redirect_uri: string;
    scopes: string[];
  };
}

export interface GoogleIntegrationStatusResponse {
  success: boolean;
  services: GoogleServiceStatus;
  cloud_setup_instructions: {
    console_url: string;
    required_steps: string[];
  };
}

export interface GoogleMapsUrlResponse {
  success: boolean;
  action_type: 'directions' | 'place_search';
  origin?: string;
  destination?: string;
  travel_mode_requested?: string;
  google_travel_mode?: string;
  query?: string;
  has_coordinates?: boolean;
  url: string;
  paid_api_required: boolean;
  limitation_notice: string;
  disclaimer?: string;
}

export interface GoogleCalendarDraftResponse {
  success: boolean;
  event_type: string;
  title: string;
  location: string;
  planned_date: string | null;
  has_explicit_date: boolean;
  is_forecast: boolean;
  provenance_label: string;
  description: string;
  google_calendar_url: string;
  ics_file_content: string;
  status_label: string;
  disclaimer: string;
}

export interface GoogleTaskDraftResponse {
  success: boolean;
  task_type: string;
  title: string;
  destination: string;
  due_date: string | null;
  structured_checklist: string[];
  copyable_text: string;
  google_tasks_web_url: string;
  calendar_reminder_url: string;
  direct_api_available: boolean;
  status_label: string;
  note: string;
}

export interface GoogleContextPayload {
  origin?: string;
  destination?: string;
  travelMode?: 'walking' | 'cycling' | 'transit' | 'driving';
  destinationName?: string;
  lat?: number;
  lon?: number;
  pollutant?: string;
  value?: number | null;
  severityCategory?: string;
  plannedDate?: string;
  startTime?: string;
  endTime?: string;
  isForecast?: boolean;
  forecastDate?: string;
  campusName?: string;
  noticeTitle?: string;
  advisoryText?: string;
}
