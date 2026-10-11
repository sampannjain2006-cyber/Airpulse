import { apiClient } from './apiClient';
import type {
  ResolvedLocation,
  GoogleStatusResponse,
} from '../types/location';

export const locationApi = {
  resolve: async (query: string): Promise<ResolvedLocation> => {
    const res = await apiClient.post<ResolvedLocation>('/location/resolve', { query });
    return res.data;
  },

  getGoogleStatus: async (): Promise<GoogleStatusResponse> => {
    const res = await apiClient.get<GoogleStatusResponse>('/location/google-status');
    return res.data;
  },
};
