import { apiClient } from './apiClient';
import type {
  RecommendationResponse,
  RecommendationRulesCatalog,
} from '../types/recommendation';

export const recommendationsApi = {
  get: async (params?: {
    station_id?: number;
    pollutant?: string;
    value?: number;
    severity_tier?: number;
    mode?: string;
    date?: string;
    model?: string;
    data_type?: string;
    target_audience?: string;
  }): Promise<RecommendationResponse> => {
    const response = await apiClient.get<RecommendationResponse>('/recommendations', { params });
    return response.data;
  },

  rules: async (): Promise<RecommendationRulesCatalog> => {
    const response = await apiClient.get<RecommendationRulesCatalog>('/recommendations/rules');
    return response.data;
  },
};
