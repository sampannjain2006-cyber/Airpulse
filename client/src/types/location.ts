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
