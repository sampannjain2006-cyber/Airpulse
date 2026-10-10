export interface AuthoritativeReference {
  organization: string;
  title: string;
  url: string;
  type: 'regulatory_standard' | 'air_quality_guideline' | 'technical_methodology';
  description: string;
}

export interface RegulatoryThresholds {
  cpcb_naaqs_24hr?: string;
  cpcb_naaqs_annual?: string;
  who_guideline_24hr?: string;
  who_guideline_annual?: string;
  cpcb_aqi_breakpoint_good?: string;
}

export interface PollutantCatalogItem {
  id: string; // 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3'
  symbol: string;
  displayName: string;
  chemicalFormulaHtml: string;
  shortDescription: string;
  whatItRepresents: string;
  primarySources: string[];
  units: {
    standard: string;
    openaq: string;
    google: string;
    notes: string;
  };
  healthRelevance: string;
  environmentalRelevance: string;
  interpretationGuide: string;
  regulatoryThresholds: RegulatoryThresholds;
  limitationsAndContext: string[];
  references: AuthoritativeReference[];
}

export interface PollutantsResponse {
  status: string;
  count: number;
  supported_pollutant_ids: string[];
  data: PollutantCatalogItem[];
}

export interface PollutantDetailResponse {
  status: string;
  data: PollutantCatalogItem;
}

/**
 * Live Contextual measurement payload that can be passed to the modal
 * when opened from Station Cards, Pollutant Grid, Hotspots, or Geo-Lookup.
 */
export interface ContextualMeasurement {
  metric: string;
  pollutantName?: string;
  value: number | null | undefined;
  unit: string;
  dateOrTimestamp?: string;
  source?: string;
  dataType?: 'observed' | 'modelled' | 'predicted';
  severityCategory?: string;
  severityColor?: string;
  stationName?: string;
  modelName?: string;
}
