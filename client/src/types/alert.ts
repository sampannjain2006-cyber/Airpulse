export interface AlertSeverityMeta {
  category: string;
  level: number;
  max_level: number;
  color: string;
  bg_color: string;
  health_implication: string;
}

export interface AlertStationMeta {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  is_dashboard_station?: boolean;
}

export interface AlertPollutantMeta {
  id: string;
  name: string;
  value: number;
  unit: string;
  lower_bound?: number | null;
  upper_bound?: number | null;
  sub_index?: number | null;
}

export interface AlertProvenanceMeta {
  source_type: string;
  provider: string;
  recorded_at?: string | null;
  ingested_at?: string | null;
  target_date?: string | null;
  model_name?: string | null;
  model_version?: string | null;
  generated_at?: string | null;
  evaluated_at: string;
}

export interface EnvironmentalAlert {
  id: string;
  event_key: string;
  alert_type: 'observed' | 'predicted';
  status_label: string;
  is_active: boolean;
  is_historical: boolean;
  rule_triggered: string;
  severity: AlertSeverityMeta;
  station: AlertStationMeta;
  pollutant: AlertPollutantMeta;
  provenance: AlertProvenanceMeta;
}

export interface AlertListResponse {
  status: string;
  alert_type: 'observed' | 'predicted';
  date: string;
  is_historical?: boolean;
  model_name?: string;
  min_threshold: {
    category: string;
    level: number;
    standard: string;
  };
  count: number;
  alerts: EnvironmentalAlert[];
  evaluated_at: string;
}

export interface UnifiedAlertsResponse {
  status: string;
  observed: AlertListResponse;
  forecast: AlertListResponse;
  total_count: number;
}

export interface AlertSummaryResponse {
  status: string;
  threshold: {
    category: string;
    level: number;
    standard: string;
  };
  observed: {
    date: string;
    is_historical: boolean;
    count: number;
    high_severity_count: number;
  };
  forecast: {
    date: string;
    model: string;
    count: number;
    high_severity_count: number;
  };
  total_active_alerts: number;
}
