import api from './api';

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

export const exportReportsCsv = (params?: Record<string, string | undefined>) =>
  api.get<Blob>('/reports/export', {
    params,
    responseType: 'blob',
  }).then((r) => r.data);

// ── Teacher self dashboard ────────────────────────────────────────────
export interface TeacherDashboardData {
  teacherName: string;
  totals: { students: number; male: number; female: number; other: number };
  stdBreakdown: Array<{ standard: string; count: number; male: number; female: number }>;
  attendance: {
    overallRate: number;
    present: number;
    absent: number;
    late: number;
    totalRecords: number;
  };
  attendanceMonthly: Array<{ monthKey: string; label: string; rate: number }>;
  studentGrowthMonthly: Array<{ monthKey: string; label: string; added: number; cumulative: number }>;
  examMonthly: Array<{ monthKey: string; label: string; avgPercent: number; studentCount: number }>;
  examGrowth: {
    firstLabel: string;
    firstAvg: number;
    latestLabel: string;
    latestAvg: number;
    deltaPercent: number;
  };
  activitiesMonthly: Array<{ monthKey: string; label: string; count: number }>;
  totalActivities: number;
  filterOptions: {
    centers: Array<{ id: string; name: string }>;
    programs: Array<{ id: string; name: string }>;
    standards: string[];
  };
  appliedFilters: {
    centerId: string | null;
    programId: string | null;
    standards: string[];
  };
}

export const getTeacherDashboard = (params?: Record<string, string | undefined>) =>
  api.get<TeacherDashboardData>('/reports/teacher-dashboard', { params }).then((r) => r.data);
