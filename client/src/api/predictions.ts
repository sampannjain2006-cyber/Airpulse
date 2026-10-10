import { apiClient } from './apiClient';
import type {
  StationForecastResponse,
  PredictionSummaryResponse,
} from '../types/prediction';

export const predictionsApi = {
  getStationForecast: async (
    stationId: number | string,
    model?: string
  ): Promise<StationForecastResponse> => {
    const response = await apiClient.get<StationForecastResponse>(
      `/predictions/stations/${stationId}`,
      { params: { model } }
    );
    return response.data;
  },

  getSummary: async (model?: string): Promise<PredictionSummaryResponse> => {
    const response = await apiClient.get<PredictionSummaryResponse>('/predictions/summary', {
      params: { model },
    });
    return response.data;
  },

  getModelsComparison: async (): Promise<import('../types/prediction').ModelsComparisonResponse> => {
    const response = await apiClient.get<import('../types/prediction').ModelsComparisonResponse>(
      '/predictions/models-comparison'
    );
    return response.data;
  },

  snapshot: async (
    date: string,
    model?: string
  ): Promise<import('../types/prediction').PredictionSnapshotResponse> => {
    const response = await apiClient.get<import('../types/prediction').PredictionSnapshotResponse>(
      '/predictions/snapshot',
      { params: { date, model } }
    );
    return response.data;
  },

  getHorizon: async (): Promise<import('../types/prediction').PredictionHorizonResponse> => {
    const response = await apiClient.get<import('../types/prediction').PredictionHorizonResponse>(
      '/predictions/horizon'
    );
    return response.data;
  },
};


