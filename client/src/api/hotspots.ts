import { apiClient } from './apiClient';
import type { HotspotsResponse } from '../types/hotspot';

export const hotspotsApi = {
  list: async (params?: {
    date?: string;
    mode?: string;
    model?: string;
    threshold?: number;
    eps?: number;
    min_stations?: number;
  }): Promise<HotspotsResponse> => {
    const res = await apiClient.get<HotspotsResponse>('/hotspots', { params });
    return res.data;
  },
};
