/**
 * AIRPULSE — Campus Support API Client (Feature 14)
 */

import axios from 'axios';
import type {
  CampusInstitution,
  CampusEnvironmentalStatus,
  CampusPolicyRule,
  PolicyEvaluationResult,
  StudentSupportProfile,
  CampusNotice,
  AccommodationRequest,
  CampusAuditLog,
  CampusCatalogMetadata,
  CampusRole,
} from '../types/campus';

const apiClient = axios.create({
  baseURL: '/api/v1/campus',
  headers: {
    'Content-Type': 'application/json',
  },
});

function getAuthHeaders(role: CampusRole = 'general_user', userId?: string) {
  return {
    'X-Campus-Role': role,
    'X-Campus-User-Id': userId || `${role}-user`,
  };
}

export const campusApi = {
  // Catalog metadata
  getCatalog: async (): Promise<CampusCatalogMetadata> => {
    const res = await apiClient.get<CampusCatalogMetadata>('/catalog');
    return res.data;
  },

  // Campuses
  listCampuses: async (): Promise<CampusInstitution[]> => {
    const res = await apiClient.get<{ data: CampusInstitution[] }>('/institutions');
    return res.data.data;
  },

  getCampus: async (campusId: number | string): Promise<CampusInstitution> => {
    const res = await apiClient.get<{ data: CampusInstitution }>(`/institutions/${campusId}`);
    return res.data.data;
  },

  // Environmental Status
  getEnvironmentalStatus: async (
    campusId: number | string,
    params: { mode?: string; date?: string; model?: string } = {}
  ): Promise<CampusEnvironmentalStatus> => {
    const res = await apiClient.get<{ data: CampusEnvironmentalStatus }>(
      `/${campusId}/environmental-status`,
      { params }
    );
    return res.data.data;
  },

  // Policies
  getPolicies: async (campusId: number | string): Promise<CampusPolicyRule[]> => {
    const res = await apiClient.get<{ data: CampusPolicyRule[] }>(`/${campusId}/policies`);
    return res.data.data;
  },

  updatePolicy: async (
    campusId: number | string,
    policyId: number | string,
    data: Partial<CampusPolicyRule>,
    role: CampusRole = 'campus_admin'
  ): Promise<CampusPolicyRule> => {
    const res = await apiClient.put<{ data: CampusPolicyRule }>(
      `/${campusId}/policies/${policyId}`,
      data,
      { headers: getAuthHeaders(role) }
    );
    return res.data.data;
  },

  evaluatePolicy: async (
    campusId: number | string,
    params: { mode?: string; date?: string; model?: string } = {},
    role: CampusRole = 'support_staff'
  ): Promise<PolicyEvaluationResult> => {
    const res = await apiClient.post<{ data: PolicyEvaluationResult }>(
      `/${campusId}/evaluate-policy`,
      params,
      { headers: getAuthHeaders(role) }
    );
    return res.data.data;
  },

  // Notices
  listNotices: async (
    campusId: number | string,
    role: CampusRole = 'general_user'
  ): Promise<CampusNotice[]> => {
    const res = await apiClient.get<{ data: CampusNotice[] }>(`/${campusId}/notices`, {
      headers: getAuthHeaders(role),
    });
    return res.data.data;
  },

  createNotice: async (
    campusId: number | string,
    data: Partial<CampusNotice>,
    role: CampusRole = 'support_staff'
  ): Promise<CampusNotice> => {
    const res = await apiClient.post<{ data: CampusNotice }>(`/${campusId}/notices`, data, {
      headers: getAuthHeaders(role),
    });
    return res.data.data;
  },

  reviewNotice: async (
    campusId: number | string,
    noticeId: number | string,
    data: { notes?: string },
    role: CampusRole = 'support_staff'
  ): Promise<CampusNotice> => {
    const res = await apiClient.post<{ data: CampusNotice }>(
      `/${campusId}/notices/${noticeId}/review`,
      data,
      { headers: getAuthHeaders(role) }
    );
    return res.data.data;
  },

  approveNotice: async (
    campusId: number | string,
    noticeId: number | string,
    data: { approved_by?: string; notes?: string },
    role: CampusRole = 'campus_admin'
  ): Promise<CampusNotice> => {
    const res = await apiClient.post<{ data: CampusNotice }>(
      `/${campusId}/notices/${noticeId}/approve`,
      data,
      { headers: getAuthHeaders(role) }
    );
    return res.data.data;
  },

  // Students (Restricted privacy)
  listStudents: async (
    campusId: number | string,
    role: CampusRole = 'support_staff'
  ): Promise<StudentSupportProfile[]> => {
    const res = await apiClient.get<{ data: StudentSupportProfile[] }>(`/${campusId}/students`, {
      headers: getAuthHeaders(role),
    });
    return res.data.data;
  },

  registerStudent: async (
    campusId: number | string,
    data: {
      display_name: string;
      academic_department: string;
      support_category: string;
      accommodation_preference: string;
      preferred_contact_channel?: string;
      consent_acknowledged: boolean;
    },
    role: CampusRole = 'student'
  ): Promise<StudentSupportProfile> => {
    const res = await apiClient.post<{ data: StudentSupportProfile }>(
      `/${campusId}/students`,
      data,
      { headers: getAuthHeaders(role) }
    );
    return res.data.data;
  },

  withdrawConsent: async (
    campusId: number | string,
    studentId: string,
    role: CampusRole = 'student'
  ): Promise<{ status: string; message: string; student_id_hash: string; withdrawn_at: string }> => {
    const res = await apiClient.post<{
      status: string;
      message: string;
      student_id_hash: string;
      withdrawn_at: string;
    }>(`/${campusId}/students/${studentId}/withdraw-consent`, {}, {
      headers: getAuthHeaders(role, studentId),
    });
    return res.data;
  },

  // Accommodations
  listAccommodations: async (
    campusId: number | string,
    role: CampusRole = 'student',
    studentId?: string
  ): Promise<AccommodationRequest[]> => {
    const res = await apiClient.get<{ data: AccommodationRequest[] }>(
      `/${campusId}/accommodations`,
      { headers: getAuthHeaders(role, studentId) }
    );
    return res.data.data;
  },

  createAccommodation: async (
    campusId: number | string,
    data: {
      student_profile_id?: number;
      student_id_hash?: string;
      course_code: string;
      accommodation_type: string;
      target_date: string;
      environmental_reason: string;
    },
    role: CampusRole = 'student'
  ): Promise<AccommodationRequest> => {
    const res = await apiClient.post<{ data: AccommodationRequest }>(
      `/${campusId}/accommodations`,
      data,
      { headers: getAuthHeaders(role, data.student_id_hash) }
    );
    return res.data.data;
  },

  decideAccommodation: async (
    campusId: number | string,
    accId: number | string,
    data: { decision: 'approved' | 'declined'; notes?: string; reviewed_by?: string },
    role: CampusRole = 'support_staff'
  ): Promise<AccommodationRequest> => {
    const res = await apiClient.post<{ data: AccommodationRequest }>(
      `/${campusId}/accommodations/${accId}/decide`,
      data,
      { headers: getAuthHeaders(role) }
    );
    return res.data.data;
  },

  // Audit Logs
  getAuditLogs: async (
    campusId: number | string,
    role: CampusRole = 'support_staff'
  ): Promise<CampusAuditLog[]> => {
    const res = await apiClient.get<{ data: CampusAuditLog[] }>(`/${campusId}/audit-logs`, {
      headers: getAuthHeaders(role),
    });
    return res.data.data;
  },
};
