import api from './api';

export type DashboardPendingCounts = {
  missingAttendance: number;
  incompleteExams: number;
  pendingForms: number;
};

export const getDashboardPending = () =>
  api.get<DashboardPendingCounts>('/dashboard/pending').then((r) => r.data);

export const getReportsDashboard = () =>
  api.get<Record<string, unknown>>('/reports/dashboard').then((r) => r.data);

export const getReportsAttendance = (params?: Record<string, string | undefined>) =>
  api.get<Record<string, unknown>>('/reports/attendance', { params }).then((r) => r.data);

export const getReportsExams = (params?: Record<string, string | undefined>) =>
  api.get<Record<string, unknown>>('/reports/exams', { params }).then((r) => r.data);

export const getReportsSkills = (params?: Record<string, string | undefined>) =>
  api.get<Record<string, unknown>>('/reports/skills', { params }).then((r) => r.data);

export const getReportsStudents = (params?: Record<string, string | undefined>) =>
  api.get<Record<string, unknown>>('/reports/students', { params }).then((r) => r.data);

export const getReportsPending = () =>
  api.get<Record<string, unknown>>('/reports/pending').then((r) => r.data);

export const exportReportsCsv = (params?: Record<string, string | undefined>) =>
  api.get<Blob>('/reports/export', {
    params,
    responseType: 'blob',
  }).then((r) => r.data);
