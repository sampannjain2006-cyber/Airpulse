import { apiClient } from './apiClient';
import type { PollutantsResponse, PollutantDetailResponse } from '../types/pollutant';

export const pollutantsApi = {
  list: async (): Promise<PollutantsResponse> => {
    const response = await apiClient.get<PollutantsResponse>('/pollutants');
    return response.data;
  },

  getById: async (id: string): Promise<PollutantDetailResponse> => {
    const response = await apiClient.get<PollutantDetailResponse>(`/pollutants/${id}`);
    return response.data;
  },
};
