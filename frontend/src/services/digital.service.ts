import api from './api';

export type DigitalKind = 'in' | 'out';

export interface DigitalRow {
  id: string; // enrollment id (in) / student id (out)
  kind: DigitalKind;
  studentId: string;
  fullName: string;
  gender: string;
  phone: string;
  stdCourse: string;
  age: number | null;
  aadharNumber: string;
  batch: string;
  area: string;
  centerName: string;
  programName: string;
  createdAt: string;
}

export interface DigitalCounts {
  total: number;
  inC: number;
  outC: number;
  male: number;
  female: number;
}

export interface DigitalListResponse {
  students: DigitalRow[];
  counts: DigitalCounts;
  batches: string[];
}

export interface DigitalInPayload {
  mode: 'in';
  studentId: string;
  batch: string;
}

export interface DigitalOutPayload {
  mode: 'out';
  fullName: string;
  age: number;
  gender?: string;
  contact?: string;
  stdCourse: string;
  aadharNumber?: string;
  area?: string;
  batch: string;
}

export type DigitalPayload = DigitalInPayload | DigitalOutPayload;

export interface DigitalMeta {
  programs: Array<{ id: string; name: string }>;
  centers: Array<{ id: string; name: string }>;
}

export interface DigitalPickStudent {
  id: string;
  fullName: string;
  standard: string;
  gender: string;
  phone: string;
  guardianName: string;
  alreadyAdded: boolean;
}

export const listDigitalStudents = () =>
  api.get<DigitalListResponse>('/digital/students').then((r) => r.data);

export const createDigitalStudent = (body: DigitalPayload) =>
  api.post<{ success: boolean; id: string }>('/digital/students', body).then((r) => r.data);

export const updateDigitalStudent = (id: string, body: DigitalPayload) =>
  api.put<{ success: boolean; id: string }>(`/digital/students/${id}`, body).then((r) => r.data);

export const deleteDigitalStudent = (id: string, mode: DigitalKind) =>
  api.delete<{ success: boolean }>(`/digital/students/${id}?mode=${mode}`).then((r) => r.data);

export const getDigitalMeta = () => api.get<DigitalMeta>('/digital/meta').then((r) => r.data);

export const getDigitalStandards = (programId: string, centerId: string) =>
  api
    .get<{ standards: string[] }>(`/digital/pick?programId=${programId}&centerId=${centerId}`)
    .then((r) => r.data);

export const getDigitalPickStudents = (programId: string, centerId: string, standard: string) =>
  api
    .get<{ students: DigitalPickStudent[] }>(
      `/digital/pick?programId=${programId}&centerId=${centerId}&standard=${encodeURIComponent(standard)}`,
    )
    .then((r) => r.data);
