export interface ForecastItem {
  day: number;
  date: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  r2: number;
  train_samples: number;
  test_samples: number;
  features: string[];
}

export interface StationForecastResponse {
  station_id: number;
  station_code: string;
  station_name: string;
  city: string;
  state: string;
  target: string;
  unit: string;
  status: 'available' | 'insufficient_data';
  model: string;
  model_display_name?: string;
  model_version?: string;
  reference_date?: string;
  forecast_horizon?: PredictionHorizonResponse;
  metrics?: ModelMetrics;
  generated_at?: string;
  last_observed?: {
    date: string;
    value: number;
  } | null;
  forecast: ForecastItem[];
  message?: string;
  source: string;
  prediction_type: string;
  explanation?: string;
}

export interface PredictionSummaryResponse {
  model: string;
  model_version: string;
  target: string;
  unit: string;
  total_stations: number;
  stations_with_forecast: number;
  stations_insufficient_data: number;
  last_generated_at: string | null;
  metrics: ModelMetrics | null;
  source: string;
  forecast_horizon_days: number;
}

export interface PredictionSnapshotItem {
  station_id: number;
  station_code: string;
  station_name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  id?: number | string | null;
  prediction_id?: number | string | null;
  prediction_date: string;
  pm25: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  model_name: string | null;
  model_version?: string | null;
  generated_at?: string | null;
  target: string;
  data_type: 'predicted';
  has_data: boolean;
}

export interface PredictionHorizonResponse {
  reference_date: string;
  horizon_days: number;
  min_date: string;
  max_date: string;
  allowed_dates: string[];
  timezone?: string;
  current_app_date?: string;
}

export interface PredictionSnapshotResponse {
  date: string;
  forecast_day: number;
  data_type: 'predicted';
  model: string;
  model_display_name?: string;
  target: string;
  unit: string;
  source: string;
  total_stations: number;
  stations_with_forecast: number;
  stations_insufficient_data: number;
  forecast_horizon: PredictionHorizonResponse;
  data: PredictionSnapshotItem[];
}

export interface ModelEvalItem {
  mae: number;
  rmse: number;
  r2: number;
  train_samples: number;
  test_samples: number;
  status: string;
  weights?: {
    xgboost: number;
    random_forest: number;
    hist_gradient_boosting: number;
  };
}

export interface ModelsComparisonResponse {
  primary_model: string;
  selection_rationale: string;
  target: string;
  unit: string;
  ensemble_weights: {
    xgboost: number;
    random_forest: number;
    hist_gradient_boosting: number;
  };
  models: {
    xgboost: ModelEvalItem;
    random_forest: ModelEvalItem;
    hist_gradient_boosting: ModelEvalItem;
    weighted_ensemble: ModelEvalItem;
  };
}


