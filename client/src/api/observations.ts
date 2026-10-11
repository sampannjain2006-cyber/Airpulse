import { apiClient } from './apiClient';
import type { ObservationsResponse, HistoryResponse } from '../types/observation';

export const observationsApi = {
  list: async (params?: {
    station_id?: number;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<ObservationsResponse> => {
    const response = await apiClient.get<ObservationsResponse>('/observations', { params });
    return response.data;
  },

  latest: async (params?: { city?: string; limit?: number }): Promise<ObservationsResponse> => {
    const response = await apiClient.get<ObservationsResponse>('/observations/latest', { params });
    return response.data;
  },

  history: async (params: {
    station_id: number;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<HistoryResponse> => {
    const response = await apiClient.get<HistoryResponse>('/observations/history', { params });
    return response.data;
  },

  snapshot: async (date: string): Promise<import('../types/observation').ObservationSnapshotResponse> => {
    const response = await apiClient.get<import('../types/observation').ObservationSnapshotResponse>(
      '/observations/snapshot',
      { params: { date } }
    );
    return response.data;
  },

  dateRange: async (): Promise<import('../types/observation').ObservationsDateRangeResponse> => {
    const response = await apiClient.get<import('../types/observation').ObservationsDateRangeResponse>(
      '/observations/date-range'
    );
    return response.data;
  },

  getCurrentCondition: async (
    stationId: number,
    params?: { disable_google?: boolean; freshness_hours?: number }
  ): Promise<import('../types/observation').StationCurrentConditionResponse> => {
    const response = await apiClient.get<import('../types/observation').StationCurrentConditionResponse>(
      `/observations/stations/${stationId}/current`,
      { params }
    );
    return response.data;
  },
};

