import { apiClient } from './apiClient';
import type {
  AlertListResponse,
  UnifiedAlertsResponse,
  AlertSummaryResponse,
} from '../types/alert';

export const alertsApi = {
  list: async (params?: {
    type?: 'observed' | 'forecast' | 'all';
    date?: string;
    model?: string;
    min_severity?: string;
    is_historical?: boolean;
  }): Promise<UnifiedAlertsResponse | AlertListResponse> => {
    const response = await apiClient.get('/alerts', {
      params: {
        ...params,
        is_historical: params?.is_historical ? 'true' : 'false',
      },
    });
    return response.data;
  },

  summary: async (params?: {
    observed_date?: string;
    forecast_date?: string;
    model?: string;
    min_severity?: string;
    is_historical?: boolean;
  }): Promise<AlertSummaryResponse> => {
    const response = await apiClient.get<AlertSummaryResponse>('/alerts/summary', {
      params: {
        ...params,
        is_historical: params?.is_historical ? 'true' : 'false',
      },
    });
    return response.data;
  },
};
