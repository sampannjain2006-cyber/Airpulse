import { apiClient } from './apiClient';
import type { SeverityResult, SeverityRulesResponse } from '../types/severity';

export const severityApi = {
  getSeverity: async (params: {
    metric: string;
    value?: number | string | null;
    is_predicted?: boolean;
    model?: string;
  }): Promise<SeverityResult> => {
    const response = await apiClient.get<SeverityResult>('/severity', { params });
    return response.data;
  },

  getRules: async (): Promise<SeverityRulesResponse> => {
    const response = await apiClient.get<SeverityRulesResponse>('/severity/rules');
    return response.data;
  },
};
