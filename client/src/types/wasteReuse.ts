/**
 * AIRPULSE — Industrial Waste Reuse & Pollution Prevention Types
 */

export interface WasteReuseEntry {
  id: string;
  name: string;
  category: string;
  category_label: string;
  origin_industry: string;
  origin_process: string;
  receiving_industry: string;
  application: string;
  verification_status: 'ESTABLISHED_REGULATORY_PATHWAY' | 'CONDITIONAL_APPROVAL_REQUIRED' | 'EMERGING_TECHNICAL_PATHWAY';
  status_label: string;
  pretreatment_requirements: string[];
  contamination_risks: string[];
  unsuitable_conditions: string[];
  regulatory_standards: string[];
  authoritative_source: string;
  source_url: string;
  limitations: string;
}

export interface WasteReuseDisclaimers {
  educational_notice: string;
  testing_requirement: string;
  regulatory_compliance: string;
  pollution_prevention_principle: string;
}

export interface WasteReuseCategory {
  id: string;
  label: string;
}

export interface WasteReuseMetadata {
  total_entries: number;
  categories: WasteReuseCategory[];
  origin_industries: string[];
  receiving_industries: string[];
  verification_status_counts: {
    established: number;
    conditional: number;
  };
}

export interface WasteReuseListResponse {
  status: string;
  count: number;
  total_available: number;
  filters_applied: {
    category: string;
    origin: string;
    receiving: string;
    search: string | null;
  };
  disclaimers: WasteReuseDisclaimers;
  data: WasteReuseEntry[];
}

export interface WasteReuseDetailResponse {
  status: string;
  disclaimers: WasteReuseDisclaimers;
  data: WasteReuseEntry;
}

export interface WasteReuseMetadataResponse {
  status: string;
  metadata: WasteReuseMetadata;
  disclaimers: WasteReuseDisclaimers;
}

export interface WasteReuseFilterParams {
  category?: string;
  origin?: string;
  receiving?: string;
  search?: string;
}
