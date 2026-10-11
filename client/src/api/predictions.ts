import { apiClient } from './apiClient';
import type {
  StationForecastResponse,
  PredictionSummaryResponse,
} from '../types/prediction';

export const predictionsApi = {
  getStationForecast: async (
    stationId: number | string,
    model?: string,
    referenceDate?: string
  ): Promise<StationForecastResponse> => {
    const response = await apiClient.get<StationForecastResponse>(
      `/predictions/stations/${stationId}`,
      { params: { model, reference_date: referenceDate } }
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
    model?: string,
    referenceDate?: string
  ): Promise<import('../types/prediction').PredictionSnapshotResponse> => {
    const response = await apiClient.get<import('../types/prediction').PredictionSnapshotResponse>(
      '/predictions/snapshot',
      { params: { date, model, reference_date: referenceDate } }
    );
    return response.data;
  },

  getHorizon: async (
    referenceDate?: string
  ): Promise<import('../types/prediction').PredictionHorizonResponse> => {
    const response = await apiClient.get<import('../types/prediction').PredictionHorizonResponse>(
      '/predictions/horizon',
      { params: { reference_date: referenceDate } }
    );
    return response.data;
  },
};


