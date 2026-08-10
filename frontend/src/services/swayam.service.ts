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
  academicYear: string;
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
  academicYear?: string;
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

// ── Dropout tracking ──────────────────────────────────────────────────

export interface DropoutStudent {
  id: string;
  programId: string;
  fullName: string;
  gender: string;
  phone: string;
  aadharNumber: string;
  age: number | null;
  dropoutStd: string;
  dropoutYear: number | null;
  animatorName: string;
  reason: string;
  locationType: SwayamLocation;
  centerId: string;
  centerName: string;
  area: string;
  reenrollSchool: string;
  reenrollYear: number | null;
  reenrollStd: string;
}

export interface DropoutListResponse {
  dropouts: DropoutStudent[];
  reenrolled: DropoutStudent[];
  counts: { dropouts: number; reenrolled: number; dropoutIn: number; dropoutOut: number };
}

export interface DropoutPayload {
  fullName: string;
  age: number;
  gender?: string;
  phone?: string;
  aadharNumber?: string;
  dropoutStd: string;
  dropoutYear: number;
  animatorName?: string;
  reason?: string;
  locationType: SwayamLocation;
  centerId?: string;
  area?: string;
}

export interface ReenrollPayload {
  school: string;
  year: number;
  std: string;
}

export const listDropouts = () =>
  api.get<DropoutListResponse>('/swayam/dropouts').then((r) => r.data);

export const createDropout = (body: DropoutPayload) =>
  api.post<{ success: boolean; id: string }>('/swayam/dropouts', body).then((r) => r.data);

export const updateDropout = (id: string, body: DropoutPayload) =>
  api.put<{ success: boolean; id: string }>(`/swayam/dropouts/${id}`, body).then((r) => r.data);

export const reenrollDropout = (id: string, body: ReenrollPayload) =>
  api.post<{ success: boolean; id: string }>(`/swayam/dropouts/${id}/reenroll`, body).then((r) => r.data);

export const updateReenrolled = (id: string, body: ReenrollPayload) =>
  api.put<{ success: boolean; id: string }>(`/swayam/dropouts/${id}/reenroll`, body).then((r) => r.data);
