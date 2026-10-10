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
