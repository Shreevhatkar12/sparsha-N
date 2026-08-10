import api from './api';

export type SwayamLocation = 'in' | 'out';

export interface SwayamStudent {
  id: string;
  fullName: string;
  standard: string;
  stream: string;
  collegeName: string;
  phone: string;
  guardianName: string;
  gender: string;
  aadharNumber: string;
  centerId: string;
  centerName: string;
  enrollmentDate: string;
  age: number | null;
  prevMarks: string;
  locationType: SwayamLocation;
  area: string;
}

export interface SwayamListResponse {
  programId: string;
  programName: string;
  students: SwayamStudent[];
}

export interface SwayamStudentPayload {
  fullName: string;
  age: number;
  currentStd: string;
  prevMarks?: string;
  prevSchool?: string;
  phone?: string;
  guardianName?: string;
  gender?: string;
  aadharNumber?: string;
  stream?: string;
  locationType: SwayamLocation;
  centerId?: string;
  area?: string;
}

export const listSwayamStudents = () =>
  api.get<SwayamListResponse>('/swayam/students').then((r) => r.data);

export const createSwayamStudent = (body: SwayamStudentPayload) =>
  api.post<{ success: boolean; id: string }>('/swayam/students', body).then((r) => r.data);

export const updateSwayamStudent = (id: string, body: SwayamStudentPayload) =>
  api.put<{ success: boolean; id: string }>(`/swayam/students/${id}`, body).then((r) => r.data);

export const deleteSwayamStudent = (id: string) =>
  api.delete<{ success: boolean }>(`/swayam/students/${id}`).then((r) => r.data);
