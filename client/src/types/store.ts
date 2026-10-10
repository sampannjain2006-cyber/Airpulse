/**
 * AIRPULSE — Pollution Protection & Accessories Store Types
 */

export interface StoreProduct {
  id: string;
  name: string;
  brand: string;
  category: 'respirators' | 'indoor_purifiers' | 'monitoring' | 'specialized_gas_protection' | 'travel_preparation';
  category_label: string;
  intended_use: string;
  pollution_concerns: string[];
  pollution_labels: string[];
  certification: string;
  limitations: string;
  seller_name: string;
  product_url: string;
  verified_price: string;
  price_currency: string;
  is_pollution_triggered: boolean;
  min_severity_tier: number;
  priority: number;
  image_badge: string;
}

export interface StoreDisclaimers {
  non_substitution_notice: string;
  gas_protection_warning: string;
  respirator_fit_notice: string;
  verified_links_notice: string;
  forecast_disclaimer: string;
}

export interface StoreCategory {
  id: string;
  label: string;
}

export interface StoreCatalogResponse {
  status: string;
  count: number;
  total_available: number;
  categories: StoreCategory[];
  disclaimers: StoreDisclaimers;
  data: StoreProduct[];
}

export interface StoreProductDetailResponse {
  status: string;
  disclaimers: StoreDisclaimers;
  data: StoreProduct;
}

export interface DestinationSummary {
  name: string;
  location: string;
  station_id: number | null;
  station_code: string | null;
}

export interface PollutionContextSummary {
  pollutant: string;
  pollutant_name: string;
  value: number | null;
  severity_tier: number | null;
  severity_category: string;
  severity_color: string;
  health_statement: string;
  mode: 'live' | 'historical' | 'forecast';
  target_date: string;
  data_provenance: {
    type: 'observed' | 'predicted' | 'modelled' | 'historical';
    label: string;
    is_modelled: boolean;
    is_predicted: boolean;
    is_historical: boolean;
    model_name: string | null;
  };
  has_valid_telemetry: boolean;
  data_status?: 'available' | 'unavailable';
  recommendation_status?: 'triggered' | 'not_triggered' | 'insufficient_data';
  is_particulate: boolean;
  is_gaseous: boolean;
}

export interface StoreRecommendationsResponse {
  status: string;
  data_status?: 'available' | 'unavailable';
  recommendation_status?: 'triggered' | 'not_triggered' | 'insufficient_data';
  destination: DestinationSummary;
  pollution_context: PollutionContextSummary;
  recommendations: {
    pollution_triggered_count: number;
    pollution_triggered_products: StoreProduct[];
    general_travel_products: StoreProduct[];
    exposure_reduction_advice: string[];
  };
  gas_protection_warning: string | null;
  disclaimers: StoreDisclaimers;
}

export interface StoreRecommendationParams {
  station_id?: number | null;
  destination?: string;
  pollutant?: string;
  value?: number | null;
  severity_tier?: number | null;
  mode?: 'live' | 'historical' | 'forecast';
  date?: string;
  model?: string;
  data_type?: 'observed' | 'predicted' | 'modelled';
}
