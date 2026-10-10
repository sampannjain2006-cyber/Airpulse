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

