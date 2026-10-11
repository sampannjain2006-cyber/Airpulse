export interface Station {
  id: number;
  station_code: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  source_type: 'cpcb' | 'openaq' | 'iot' | 'manual';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StationsResponse {
  count: number;
  stations: Station[];
}

export interface CityHierarchyItem {
  city: string;
  station_count: number;
  has_dashboard_station?: boolean;
}

export interface StateHierarchyItem {
  state: string;
  station_count: number;
  cities: CityHierarchyItem[];
}

export interface StationHierarchyResponse {
  states: StateHierarchyItem[];
}

