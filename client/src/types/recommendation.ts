export interface RecommendationSource {
  name: string;
  document: string;
  url: string;
  type: string;
}

export interface RecommendationContext {
  mode: 'live' | 'historical' | 'forecast';
  context_label: string;
  pollutant: string;
  pollutant_display: string;
  value: number | null;
  unit: string;
  sub_index: number | null;
  severity: {
    level: number;
    category: string;
    color: string;
    bg_color: string;
    health_implication: string;
  };
  station?: {
    id: number;
    code: string;
    name: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  } | null;
  date_or_timestamp: string | null;
  provider: string;
  data_type: 'observed' | 'predicted' | 'modelled';
  model_name?: string | null;
  is_historical: boolean;
  is_predicted: boolean;
  is_modelled: boolean;
}

export interface PrecautionRecommendation {
  id: string;
  rule_id: string;
  title: string;
  explanation: string;
  priority: number;
  target_audience: 'all' | 'general_public' | 'sensitive_groups' | 'outdoor_workers';
  applicable_pollutant: string;
  severity_tier: number;
  severity_category: string;
  trigger_description: string;
  rationale: string;
  disclaimer?: string;
  source: RecommendationSource;
  context: {
    mode: string;
    context_label: string;
    is_historical: boolean;
    is_predicted: boolean;
    is_modelled: boolean;
    timestamp_or_date: string | null;
    provider: string;
    model_name: string | null;
  };
}

export interface RecommendationResponse {
  status: 'success' | 'unavailable';
  reason?: string;
  context: RecommendationContext;
  count: number;
  recommendations: PrecautionRecommendation[];
  disclaimer: string;
}

export interface RecommendationRule {
  id: string;
  title: string;
  explanation: string;
  applicable_pollutants: string[];
  min_severity_tier: number;
  max_severity_tier: number;
  target_audience: string;
  priority: number;
  trigger_description: string;
  rationale: string;
  source: RecommendationSource;
  disclaimer?: string;
}

export interface RecommendationRulesCatalog {
  status: string;
  total_rules: number;
  sources: Record<string, RecommendationSource>;
  rules: RecommendationRule[];
}
