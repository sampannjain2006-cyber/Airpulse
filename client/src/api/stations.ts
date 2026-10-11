import { apiClient } from './apiClient';
import type { StationsResponse, Station, StationHierarchyResponse } from '../types/station';

export const stationsApi = {
  list: async (params?: {
    city?: string;
    state?: string;
    limit?: number;
    dashboard_only?: boolean;
    scope?: string;
  }): Promise<StationsResponse> => {
    const response = await apiClient.get<StationsResponse>('/stations', { params });
    return response.data;
  },

  getHierarchy: async (): Promise<StationHierarchyResponse> => {
    const response = await apiClient.get<StationHierarchyResponse>('/stations/hierarchy');
    return response.data;
  },

  getById: async (id: number | string): Promise<Station> => {
    const response = await apiClient.get<Station>(`/stations/${id}`);
    return response.data;
  },
};
