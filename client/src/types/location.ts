import type { SeverityResult } from './severity';

export interface ResolvedLocation {
  found: boolean;
  canonical_name: string;
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  place_id?: string;
  location_type?: string;
  resolution_source: 'google_geocoding' | 'local_geographic_registry' | 'local_database_fallback' | 'direct_coordinates' | 'unconfigured';
  google_status?: string;
  error?: string;
}

export interface PrimaryReading {
  provider: 'OpenAQ Ground Station' | 'Google Air Quality API';
  provider_code: 'openaq' | 'google';
  data_type: 'observed' | 'modelled';
  data_type_label: 'Ground Measured Observation' | 'Google Modelled / Spatial Interpolation';
  metric: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  aqi: number | null;
  aqi_name?: string | null;
  timestamp: string | null;
  freshness_text: string | null;
  is_stale: boolean;
  severity: SeverityResult | null;
  station_info?: {
    id: number;
    station_code: string;
    name: string;
    city: string;
    state: string;
    distance_km: number;
  } | null;
  universal_aqi?: {
    aqi: number;
    aqi_display: string;
    category: string;
    dominant_pollutant: string;
  } | null;
  local_aqi?: {
    code: string;
    displayName: string;
    aqi: number;
    aqi_display: string;
    category: string;
    dominant_pollutant: string;
  } | null;
  health_recommendations?: {
    generalPopulation?: string;
    elderly?: string;
    lungDiseasePopulation?: string;
    heartDiseasePopulation?: string;
    athletes?: string;
    pregnantWomen?: string;
    children?: string;
  } | null;
}

export interface NearbyOpenAQReference {
  station_id: number;
  station_code: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  is_dashboard_station: boolean;
  sensors: string[];
  last_updated_at: string | null;
  has_observation: boolean;
  last_observed_at: string | null;
  last_pm25: number | null;
}

export interface LocationLookupResponse {
  status: 'success' | 'unavailable' | 'location_not_found' | 'error';
  message?: string;
  query?: string;
  location: ResolvedLocation;
  criteria: {
    proximity_radius_km: number;
    freshness_hours: number;
    reference_time: string;
    standard?: string;
  };
  primary_reading: PrimaryReading | null;
  openaq_status: {
    suitable: boolean;
    nearby_stations_count: number;
    selected_station?: string;
    distance_km?: number;
    observation_age_hours?: number;
    closest_station?: {
      name: string;
      distance_km: number;
      last_updated_at: string | null;
    } | null;
    reason: string;
  };
  google_status: {
    configured: boolean;
    status: string;
    message?: string;
    data?: Record<string, unknown> | null;
  };
  nearby_openaq_reference: NearbyOpenAQReference[];
}

export interface GoogleStatusResponse {
  configured: boolean;
  env_var_name: string;
  services: {
    geocoding_api: {
      purpose: string;
      status: string;
      endpoint: string;
    };
    air_quality_api: {
      purpose: string;
      status: string;
      endpoint: string;
    };
  };
  billing_required: boolean;
  billing_note: string;
  setup_instructions: string;
}
