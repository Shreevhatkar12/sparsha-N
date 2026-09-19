import api from './api';

export type CreateSessionBody = {
  centerId: string;
  programId: string;
  sessionDate: string;
  activityId?: string;
};

export type UpdateSessionRecordsBody = Record<string, unknown>;

export const createAttendanceSession = (body: CreateSessionBody) =>
  api.post<Record<string, unknown>>('/attendance/sessions', body).then((r) => r.data);

export const getAttendanceSessions = (params?: Record<string, string | undefined>) =>
  api.get<Record<string, unknown>>('/attendance/sessions', { params }).then((r) => r.data);

export const getAttendanceSessionById = (sessionId: string) =>
  api.get<Record<string, unknown>>(`/attendance/sessions/${sessionId}`).then((r) => r.data);

export const getAttendanceSessionRecords = (sessionId: string) =>
  api.get<{ records: unknown[] }>(`/attendance/sessions/${sessionId}/records`).then((r) => r.data);

export const updateAttendanceSessionRecords = (
  sessionId: string,
  body: UpdateSessionRecordsBody,
) =>
  api
    .put<Record<string, unknown>>(`/attendance/sessions/${sessionId}/records`, body)
    .then((r) => r.data);

export const getStudentAttendance = (studentId: string) =>
  api.get<Record<string, unknown>>(`/attendance/students/${studentId}`).then((r) => r.data);

export const getAttendanceSummary = (params?: Record<string, string | undefined>) =>
  api.get<Record<string, unknown>>('/attendance/summary', { params }).then((r) => r.data);

export const getPendingAttendanceSessions = (params?: Record<string, string | undefined>) =>
  api.get<Record<string, unknown>>('/attendance/pending', { params }).then((r) => r.data);

export const getTodayFreshSheet = (centerId: string, programId: string) =>
  api.get<Record<string, unknown>>('/attendance/fresh-sheet', { params: { centerId, programId } }).then((r) => r.data);

export const markHoliday = (sessionId: string, isHoliday: boolean) =>
  api.put<Record<string, unknown>>(`/attendance/sessions/${sessionId}/holiday`, { isHoliday }).then((r) => r.data);

export const getRecentAbsentees = (days: number = 7) =>
  api.get<any[]>('/attendance/absentees', { params: { days } }).then((r) => r.data);

// Downloads the long-absentee Excel report (7+/1mo+/2mo+/3mo+ tabs plus a
// "Never Attended" tab) for the given year, optionally restricted to
// specific months (1-12). Triggers a browser file save.
export const downloadAbsenteeReport = async (year: number, months?: number[]) => {
  const res = await api.get('/attendance/absentee-report', {
    params: { year, months: months && months.length ? months.join(',') : undefined },
    responseType: 'blob',
  });
  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const label = months && months.length ? `${months.length}-months` : `${year}-full-year`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `absentee-report-${label}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
