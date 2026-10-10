import { apiClient } from './apiClient';
import type {
  StoreCatalogResponse,
  StoreProductDetailResponse,
  StoreRecommendationsResponse,
  StoreRecommendationParams,
} from '../types/store';

export const storeApi = {
  listProducts: async (params?: { category?: string; pollutant?: string; is_pollution_triggered?: boolean }): Promise<StoreCatalogResponse> => {
    const response = await apiClient.get<StoreCatalogResponse>('/store/products', { params });
    return response.data;
  },

  getProduct: async (id: string): Promise<StoreProductDetailResponse> => {
    const response = await apiClient.get<StoreProductDetailResponse>(`/store/products/${id}`);
    return response.data;
  },

  getRecommendations: async (params: StoreRecommendationParams): Promise<StoreRecommendationsResponse> => {
    const response = await apiClient.get<StoreRecommendationsResponse>('/store/recommendations', { params });
    return response.data;
  },
};
