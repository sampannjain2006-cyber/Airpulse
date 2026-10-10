/**
 * AIRPULSE — Pollution-Aware Route Planning Types (Walking & Cycling Priority)
 */

export type TravelMode = 'walking' | 'cycling';

export interface RouteStation {
  id: number;
  name: string;
  city: string;
  distance_meters: number;
  latitude: number;
  longitude: number;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  recorded_at: string | null;
  source: string | null;
}

export interface RoutePollutionAnalysis {
  status: 'available' | 'insufficient_data';
  coverage_pct: number;
  corridor_avg_concentration: number | null;
  pollutant: string;
  severity: {
    tier: number;
    category: string;
    color: string;
    health_implication: string;
  } | null;
  nearby_stations_count: number;
  stations: RouteStation[];
  data_provenance_label: string;
  methodology_note: string;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [longitude, latitude]
}

export interface AnalyzedRoute {
  route_index: number;
  name: string;
  mode: TravelMode;
  mode_label: string;
  distance_km: number;
  distance_meters: number;
  duration_minutes: number;
  duration_seconds: number;
  geometry: RouteGeometry;
  steps_count: number;
  pollution_analysis: RoutePollutionAnalysis;
  is_fastest: boolean;
  is_lower_exposure: boolean;
  tag: string;
}

export interface RouteComparison {
  verdict: string;
  note: string;
  has_comparable_exposure: boolean;
  fastest_route_index: number;
  lowest_exposure_route_index: number | null;
}

export interface RoutePlanResponse {
  status: string;
  origin: {
    name: string;
    latitude: number;
    longitude: number;
    source: string;
  };
  destination: {
    name: string;
    latitude: number;
    longitude: number;
    source: string;
  };
  travel_mode: TravelMode;
  travel_mode_label: string;
  target_pollutant: string;
  routes_count: number;
  comparison: RouteComparison;
  routes: AnalyzedRoute[];
  disclaimers: {
    safety_notice: string;
    ventilation_notice: string;
    data_provenance_notice: string;
    provider_attribution: string;
  };
}

export interface RoutePlanParams {
  origin: string | { latitude: number; longitude: number; name?: string };
  destination: string | { latitude: number; longitude: number; name?: string };
  mode?: TravelMode;
  pollutant?: string;
}
