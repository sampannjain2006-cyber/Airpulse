export interface OpenAQLocation {
  id: number;
  station_code: string;
  openaq_location_id: number | null;
  name: string;
  locality: string | null;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  source_type: string;
  is_dashboard_station: boolean;
  is_active: boolean;
  timezone: string | null;
  owner_name: string | null;
  provider_name: string | null;
  sensors_summary: string[];
  last_updated_at: string | null;
  distance_meters?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OpenAQLocationsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: OpenAQLocation[];
}

export interface NearbyOpenAQResponse {
  query: {
    latitude: number;
    longitude: number;
    radius_meters: number;
    radius_km: number;
    limit: number;
  };
  count: number;
  locations: OpenAQLocation[];
}

export interface OpenAQCoverageResponse {
  provider: string;
  country: string;
  total_locations: number;
  dashboard_stations: number;
  expanded_network_stations: number;
  active_locations: number;
  cities_count: number;
  states_count: number;
  last_synced_at: string | null;
}
