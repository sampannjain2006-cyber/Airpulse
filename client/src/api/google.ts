/**
 * AIRPULSE — Google Services API Client (Feature 15)
 */

import axios from 'axios';
import type {
  GoogleIntegrationStatusResponse,
  GoogleMapsUrlResponse,
  GoogleCalendarDraftResponse,
  GoogleTaskDraftResponse,
} from '../types/google';

const apiClient = axios.create({
  baseURL: '/api/v1/google',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const googleApi = {
  getStatus: async (): Promise<GoogleIntegrationStatusResponse> => {
    const res = await apiClient.get<{ status: string; data: GoogleIntegrationStatusResponse }>('/status');
    return res.data.data;
  },

  getMapsUrl: async (payload: {
    origin?: string;
    destination?: string;
    travelMode?: string;
    destinationName?: string;
    lat?: number;
    lon?: number;
  }): Promise<GoogleMapsUrlResponse> => {
    const res = await apiClient.post<{ status: string; data: GoogleMapsUrlResponse }>('/maps/url', payload);
    return res.data.data;
  },

  getCalendarDraft: async (payload: {
    eventType?: string;
    title?: string;
    destination?: string;
    campus?: string;
    plannedDate?: string;
    startTime?: string;
    endTime?: string;
    pollutant?: string;
    value?: number | null;
    severityCategory?: string;
    isForecast?: boolean;
    forecastDate?: string;
    advisoryText?: string;
    airpulseUrl?: string;
  }): Promise<GoogleCalendarDraftResponse> => {
    const res = await apiClient.post<{ status: string; data: GoogleCalendarDraftResponse }>('/calendar/draft', payload);
    return res.data.data;
  },

  getTaskDraft: async (payload: {
    taskType?: string;
    title?: string;
    destination?: string;
    plannedDate?: string;
    pollutant?: string;
    value?: number | null;
    severityCategory?: string;
    requiredAccessories?: string[];
    airpulseUrl?: string;
  }): Promise<GoogleTaskDraftResponse> => {
    const res = await apiClient.post<{ status: string; data: GoogleTaskDraftResponse }>('/tasks/draft', payload);
    return res.data.data;
  },

  getAuthUrl: async (): Promise<{ auth_url: string; state: string }> => {
    const res = await apiClient.get<{ status: string; data: { auth_url: string; state: string } }>('/auth/url');
    return res.data.data;
  },

  disconnectOAuth: async (sessionId?: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ status: string; data: { success: boolean; message: string } }>(
      '/auth/disconnect',
      { session_id: sessionId }
    );
    return res.data.data;
  },

  createDirectTask: async (
    sessionId: string,
    taskPayload: { title: string; notes?: string; due_date?: string }
  ): Promise<{ success: boolean; task_id: string; title: string; message: string }> => {
    const res = await apiClient.post<{ status: string; data: any }>('/tasks/create', taskPayload, {
      headers: { 'X-Google-Session': sessionId },
    });
    return res.data.data;
  },
};
