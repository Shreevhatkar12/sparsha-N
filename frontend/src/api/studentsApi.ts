import { apiClient } from '../lib/apiClient';
import type { DashboardStats, StudentsResponse } from '../types/api';

export const studentsApi = {
  async dashboard(): Promise<DashboardStats> {
    const response = await apiClient.get<{ success: boolean; data: DashboardStats }>(
      '/api/students/dashboard',
    );
    return response.data.data;
  },

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<StudentsResponse> {
    const response = await apiClient.get<StudentsResponse>('/api/students', { params });
    return response.data;
  },

  async byId(id: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(`/api/students/${id}`);
    return response.data;
  },

  async attendance(studentId: string): Promise<Record<string, unknown>[]> {
    const response = await apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>(
      `/api/students/${studentId}/attendance`,
    );
    return response.data.data;
  },

  async skills(studentId: string): Promise<Record<string, unknown>[]> {
    const response = await apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>(
      `/api/students/${studentId}/skills`,
    );
    return response.data.data;
  },

  async careers(studentId: string): Promise<Record<string, unknown>[]> {
    const response = await apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>(
      `/api/students/${studentId}/careers`,
    );
    return response.data.data;
  },

  async addAttendance(studentId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post(`/api/students/${studentId}/attendance`, payload);
    return response.data;
  },

  async addSkill(studentId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post(`/api/students/${studentId}/skills`, payload);
    return response.data;
  },

  async addCareer(studentId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post(`/api/students/${studentId}/careers`, payload);
    return response.data;
  },
};
