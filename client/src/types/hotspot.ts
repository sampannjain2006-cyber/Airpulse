import type { SeverityResult } from './severity';

export interface ContributingStation {
  station_id: number;
  station_code: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  pm25: number;
  recorded_at?: string;
  source?: string;
  lower_bound?: number;
  upper_bound?: number;
  model_name?: string;
  dist_to_center_km: number;
}

export interface Hotspot {
  id: string;
  cluster_id: number;
  title: string;
  date: string;
  mode: 'observed' | 'forecast';
  data_type: 'observed' | 'predicted';
  data_type_label: string;
  pollutant: string;
  pollutant_unit: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius_meters: number;
  actual_cluster_radius_meters: number;
  bounding_geojson?: any;
  station_count: number;
  avg_pm25: number;
  max_pm25: number;
  min_pm25: number;
  severity: SeverityResult;
  max_severity: SeverityResult;
  scoring: {
    metric: string;
    formula: string;
    value: number;
    components: {
      avg_pm25: number;
      station_count: number;
      log2_multiplier: number;
    };
  };
  model_name?: string | null;
  source: string;
  contributing_stations: ContributingStation[];
  created_at: string;
}

export interface HotspotsResponse {
  status: 'success' | 'error';
  mode: 'observed' | 'forecast';
  date: string;
  pollutant: string;
  pollutant_unit: string;
  config: {
    threshold_pm25: number;
    eps_meters: number;
    eps_km: number;
    min_stations: number;
    clustering_method: string;
    model_name?: string | null;
    severity_standard: string;
  };
  hotspots_count: number;
  hotspots: Hotspot[];
  message?: string;
}
