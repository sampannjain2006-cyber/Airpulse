/**
 * AIRPULSE — Route Planning API Client
 */

import { apiClient } from './apiClient';
import type { RoutePlanParams, RoutePlanResponse } from '../types/route';

export const routesApi = {
  planRoute: async (params: RoutePlanParams): Promise<RoutePlanResponse> => {
    // If coordinates are provided as objects, flatten for query params
    const queryParams: Record<string, any> = {
      mode: params.mode || 'walking',
      pollutant: params.pollutant || 'pm25',
    };

    if (typeof params.origin === 'object') {
      queryParams.origin_lat = params.origin.latitude;
      queryParams.origin_lon = params.origin.longitude;
      if (params.origin.name) queryParams.origin_name = params.origin.name;
    } else {
      queryParams.origin = params.origin;
    }

    if (typeof params.destination === 'object') {
      queryParams.destination_lat = params.destination.latitude;
      queryParams.destination_lon = params.destination.longitude;
      if (params.destination.name) queryParams.destination_name = params.destination.name;
    } else {
      queryParams.destination = params.destination;
    }

    const response = await apiClient.get<RoutePlanResponse>('/routes/plan', {
      params: queryParams,
    });
    return response.data;
  },
};
