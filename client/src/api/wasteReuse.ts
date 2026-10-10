import { apiClient } from './apiClient';
import type {
  WasteReuseListResponse,
  WasteReuseDetailResponse,
  WasteReuseMetadataResponse,
  WasteReuseFilterParams,
} from '../types/wasteReuse';

export const wasteReuseApi = {
  list: async (params?: WasteReuseFilterParams): Promise<WasteReuseListResponse> => {
    const response = await apiClient.get<WasteReuseListResponse>('/waste-reuse', { params });
    return response.data;
  },

  getById: async (id: string): Promise<WasteReuseDetailResponse> => {
    const response = await apiClient.get<WasteReuseDetailResponse>(`/waste-reuse/${id}`);
    return response.data;
  },

  getMetadata: async (): Promise<WasteReuseMetadataResponse> => {
    const response = await apiClient.get<WasteReuseMetadataResponse>('/waste-reuse/metadata');
    return response.data;
  },
};
