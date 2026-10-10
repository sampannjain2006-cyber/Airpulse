export type SeverityCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export interface SeverityCategoryMeta {
  level: number;
  name: SeverityCategory;
  color: string;
  bgColor: string;
  implication: string;
}

export interface SeverityBand {
  min: number;
  max: number;
  aqiMin: number;
  aqiMax: number;
  level: number;
  category: SeverityCategory;
}

export interface PollutantBreakpointConfig {
  displayName: string;
  unit: string;
  maxValid: number;
  bands: SeverityBand[];
}

export interface SeverityResult {
  status: 'valid' | 'unavailable';
  reason?: string;
  metric: string | null;
  metric_display?: string;
  value: number | null;
  unit?: string;
  category?: SeverityCategory;
  severity_level?: number;
  max_severity_level?: number;
  band_min?: number;
  band_max?: number;
  aqi_sub_index?: number | null;
  color?: string;
  bg_color?: string;
  health_implication?: string;
  is_predicted?: boolean;
  model_name?: string | null;
  rule_source?: string;
}

export interface SeverityRulesResponse {
  rule_source: string;
  standard: string;
  categories: SeverityCategoryMeta[];
  supported_metrics: Array<{
    metric: string;
    displayName: string;
    unit: string;
    bands: SeverityBand[];
  }>;
}
