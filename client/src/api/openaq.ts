import { apiClient } from './apiClient';
import type {
  OpenAQLocation,
  OpenAQLocationsResponse,
  NearbyOpenAQResponse,
  OpenAQCoverageResponse,
} from '../types/openaq';

export const openaqApi = {
  getLocations: async (params?: {
    page?: number;
    limit?: number;
    city?: string;
    state?: string;
    search?: string;
    dashboard_only?: boolean;
  }): Promise<OpenAQLocationsResponse> => {
    const response = await apiClient.get<OpenAQLocationsResponse>('/openaq/locations', { params });
    return response.data;
  },

  getLocationById: async (id: number | string): Promise<OpenAQLocation> => {
    const response = await apiClient.get<OpenAQLocation>(`/openaq/locations/${id}`);
    return response.data;
  },

  getNearby: async (params: {
    lat: number;
    lon: number;
    radius?: number;
    limit?: number;
  }): Promise<NearbyOpenAQResponse> => {
    const response = await apiClient.get<NearbyOpenAQResponse>('/openaq/locations/nearby', { params });
    return response.data;
  },

  getCoverage: async (): Promise<OpenAQCoverageResponse> => {
    const response = await apiClient.get<OpenAQCoverageResponse>('/openaq/coverage');
    return response.data;
  },

  sync: async (params?: { max_locations?: number; page_size?: number }): Promise<any> => {
    const response = await apiClient.post('/openaq/sync', params);
    return response.data;
  },
};
