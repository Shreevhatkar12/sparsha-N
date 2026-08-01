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
  gradeOverall: { A: number; B: number; C: number; D: number; E: number };
  gradeByStd: Array<{
    standard: string;
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    total: number;
  }>;
  gradeByMonth: Array<{
    monthKey: string;
    label: string;
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    total: number;
  }>;
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

// ── Admin analytics (super/tech = all, center_admin = own centers) ────
type Grade5 = { A: number; B: number; C: number; D: number; E: number };
type MonthPoint = { monthKey: string; label: string; count: number };

export interface AdminAnalyticsData {
  scope: string;
  kpis: {
    totalStudents: number;
    male: number;
    female: number;
    other: number;
    totalTeachers: number;
    totalCenters: number;
    overallAttendanceRate: number;
    examsConducted: number;
    avgExamPercent: number;
    totalActivities: number;
    studentMeetings: number;
    parentMeetings: number;
  };
  attendanceMonthly: Array<{ monthKey: string; label: string; rate: number }>;
  gradeOverall: Grade5;
  gradeByMonth: Array<{ monthKey: string; label: string } & Grade5 & { total: number }>;
  gradeByStd: Array<{ standard: string } & Grade5 & { total: number }>;
  avgBySubject: Array<{ name: string; avgPercent: number }>;
  enrollmentMonthly: Array<{
    monthKey: string;
    label: string;
    added: number;
    cumulative: number;
    male: number;
    female: number;
  }>;
  activitiesMonthly: MonthPoint[];
  centerComparison: Array<{
    centerId: string;
    name: string;
    students: number;
    attendanceRate: number;
    avgExamPercent: number;
    activities: number;
  }>;
  teacherSummary: Array<{
    teacherId: string;
    name: string;
    students: number;
    examsEntered: number;
    avgPercent: number;
    attendanceRate: number;
    activities: number;
  }>;
  meetings: {
    studentTotal: number;
    parentTotal: number;
    studentPresent: number;
    parentAttendees: number;
    parentMale: number;
    parentFemale: number;
    studentMonthly: MonthPoint[];
    parentMonthly: MonthPoint[];
  };
  atRisk: Array<{
    studentId: string;
    name: string;
    center: string;
    standard: string;
    attendanceRate: number | null;
    avgPercent: number | null;
    grade: string | null;
    reasons: string[];
  }>;
  dataCompleteness: {
    totalStudents: number;
    withMarks: number;
    withoutMarks: number;
    withAttendance: number;
    withoutAttendance: number;
    marksPercent: number;
    attendancePercent: number;
  };
  genderEquity: {
    byProgram: Array<{ program: string; male: number; female: number }>;
    attendanceByGender: { maleRate: number; femaleRate: number };
    gradeByGender: { male: Grade5; female: Grade5 };
  };
  filterOptions: {
    centers: Array<{ id: string; name: string }>;
    programs: Array<{ id: string; name: string }>;
    standards: string[];
    teachers: Array<{ id: string; fullName: string }>;
    grades: string[];
  };
  appliedFilters: {
    centerId: string | null;
    programId: string | null;
    standard: string | null;
    grade: string | null;
    teacherId: string | null;
  };
}

export const getAdminAnalytics = (params?: Record<string, string | undefined>) =>
  api.get<AdminAnalyticsData>('/reports/admin-analytics', { params }).then((r) => r.data);
