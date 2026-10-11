export interface Observation {
  id: number;
  station_id: number;
  station_code: string;
  station_name: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  recorded_at: string;
  aqi: number | null;
  aqi_category: string | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  source: string;
  ingested_at: string;
}

export interface ObservationsResponse {
  count: number;
  data: Observation[];
  filters?: {
    stationId?: number;
    from?: string;
    to?: string;
    limit?: number;
  };
}

export interface HistoryObservation {
  id: number;
  recorded_at: string;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  source: string;
}

export interface HistoryResponse {
  station: import('./station').Station;
  count: number;
  data: HistoryObservation[];
}

export interface ObservationSnapshotItem {
  station_id: number;
  station_code: string;
  station_name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  id?: number | string | null;
  observation_id?: number | string | null;
  recorded_at: string | null;
  aqi: number | null;
  aqi_category: string | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  source: string | null;
  ingested_at?: string | null;
  data_type: 'observed';
  has_data: boolean;
}

export interface ObservationSnapshotResponse {
  date: string;
  data_type: 'observed';
  source: string;
  total_stations: number;
  stations_with_data: number;
  stations_missing_data: number;
  date_range: {
    min_date: string;
    max_date: string;
    total_distinct_dates: number;
  };
  data: ObservationSnapshotItem[];
}

export interface ObservationsDateRangeResponse {
  min_date: string;
  max_date: string;
  total_distinct_dates: number;
}

export interface StationCurrentConditionResponse {
  station_id: number;
  station_code?: string;
  station_name?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  data_type: 'observed' | 'modelled' | 'unavailable';
  source: string | null;
  provider?: string;
  data_type_label?: string;
  recorded_at?: string;
  age_hours?: number | null;
  is_fresh: boolean;
  fallback_applied?: boolean;
  fallback_reason?: string;
  openaq_stale_observation?: {
    recorded_at: string;
    age_hours: number | null;
    pm25?: number | null;
    aqi?: number | null;
  } | null;
  warning?: string;
  aqi?: number | null;
  aqi_category?: string | null;
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;
  o3?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  universal_aqi?: {
    aqi: number;
    aqi_display: string;
    category: string;
    dominant_pollutant?: string;
  } | null;
  local_aqi?: {
    code: string;
    displayName: string;
    aqi: number;
    aqi_display: string;
    category: string;
    dominant_pollutant?: string;
  } | null;
  pollutants?: Record<string, {
    value: number | null;
    unit: string;
    display_name?: string;
  }>;
  cached?: boolean;
  status: 'success' | 'stale' | 'unavailable';
  message?: string;
}

