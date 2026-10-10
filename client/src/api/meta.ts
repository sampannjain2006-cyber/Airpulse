import { apiClient } from './apiClient';
import type { SystemStatus } from '../types/meta';

export const metaApi = {
  getStatus: async (): Promise<SystemStatus> => {
    const response = await apiClient.get<SystemStatus>('/meta/status');
    return response.data;
  },
};
