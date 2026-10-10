import { apiClient } from './apiClient';
import type {
  LocationLookupResponse,
  ResolvedLocation,
  GoogleStatusResponse,
} from '../types/location';

export const locationApi = {
  resolve: async (query: string): Promise<ResolvedLocation> => {
    const res = await apiClient.post<ResolvedLocation>('/location/resolve', { query });
    return res.data;
  },

  lookup: async (params: {
    query?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    freshness_hours?: number;
    reference_time?: string;
  }): Promise<LocationLookupResponse> => {
    const res = await apiClient.post<LocationLookupResponse>('/location/lookup', params);
    return res.data;
  },

  getGoogleStatus: async (): Promise<GoogleStatusResponse> => {
    const res = await apiClient.get<GoogleStatusResponse>('/location/google-status');
    return res.data;
  },
};
