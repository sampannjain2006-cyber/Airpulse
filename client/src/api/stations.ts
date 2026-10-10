import { apiClient } from './apiClient';
import type { StationsResponse, Station } from '../types/station';

export const stationsApi = {
  list: async (params?: { city?: string; state?: string; limit?: number }): Promise<StationsResponse> => {
    const response = await apiClient.get<StationsResponse>('/stations', { params });
    return response.data;
  },

  getById: async (id: number | string): Promise<Station> => {
    const response = await apiClient.get<Station>(`/stations/${id}`);
    return response.data;
  },
};
