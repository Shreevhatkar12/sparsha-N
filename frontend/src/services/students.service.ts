import api from './api';
import type {
  ApiEnvelope,
  AttendanceRecordPayload,
  Student,
  StudentCreatePayload,
  StudentProfilePayload,
  StudentUpdatePayload,
  StudentsListResult,
} from '../types';

export type StudentListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  centerId?: string;
  programId?: string;
  isActive?: boolean | string;
};

export type StudentFilterQuery = Record<string, string | number | boolean | undefined>;

export const getStudents = (params?: StudentListQuery) =>
  api.get<StudentsListResult>('/students', { params }).then((r) => r.data);

export const filterStudents = (params?: StudentFilterQuery) =>
  api.get<StudentsListResult>('/students/filter', { params }).then((r) => r.data);

export const getStudentDashboardStats = () =>
  api
    .get<ApiEnvelope<Record<string, unknown>>>('/students/dashboard')
    .then((r) => r.data);

export const getStudentById = (id: string) =>
  api.get<Student>(`/students/${id}`).then((r) => r.data);

export const getStudentSummary = (id: string) =>
  api.get<Record<string, unknown>>(`/students/${id}/summary`).then((r) => r.data);

export const getStudentProfile = (id: string) =>
  api.get<StudentProfilePayload>(`/students/${id}/profile`).then((r) => r.data);

export const createStudent = (payload: StudentCreatePayload) =>
  api.post<ApiEnvelope<Student>>('/students', payload).then((r) => r.data.data);

export const updateStudent = (id: string, payload: StudentUpdatePayload) =>
  api.put<Student>(`/students/${id}`, payload).then((r) => r.data);

export const deleteStudent = (id: string) =>
  api.delete<Record<string, unknown>>(`/students/${id}`).then((r) => r.data);

export const addStudentAttendance = (studentId: string, payload: AttendanceRecordPayload) =>
  api
    .post<ApiEnvelope<unknown>>(`/students/${studentId}/attendance`, payload)
    .then((r) => r.data);

export const getAttendanceByStudent = (studentId: string) =>
  api
    .get<ApiEnvelope<unknown[]>>(`/students/${studentId}/attendance`)
    .then((r) => r.data);

export const updateStudentAttendance = (attendanceId: string, payload: AttendanceRecordPayload) =>
  api
    .put<ApiEnvelope<unknown>>(`/students/attendance/${attendanceId}`, payload)
    .then((r) => r.data);
