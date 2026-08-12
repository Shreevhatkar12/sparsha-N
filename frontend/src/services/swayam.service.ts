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

// ── Sponsorship / Scholarship tracking ────────────────────────────────

export type SupportType = 'sponsorship' | 'scholarship';
export type SponsorshipStatus = 'pending' | 'done';

export interface SponsorshipStudent {
  id: string;
  fullName: string;
  gender: string;
  phone: string;
  age: number | null;
  email: string;
  area: string;
  schoolName: string;
  stream: string;
  stdCourse: string;
  animatorName: string;
  donorName: string;
  supportType: SupportType;
  status: SponsorshipStatus;
}

export interface SponsorshipCounts {
  total: number;
  pending: number;
  done: number;
  sponsorship: number;
  scholarship: number;
  male: number;
  female: number;
}

export interface SponsorshipListResponse {
  pending: SponsorshipStudent[];
  done: SponsorshipStudent[];
  counts: SponsorshipCounts;
}

export interface SponsorshipPayload {
  fullName: string;
  age: number;
  gender?: string;
  phone?: string;
  email?: string;
  area?: string;
  schoolName?: string;
  stream?: string;
  stdCourse: string;
  animatorName?: string;
  donorName?: string;
  supportType: SupportType;
}

export const listSponsorships = () =>
  api.get<SponsorshipListResponse>('/swayam/sponsorships').then((r) => r.data);

export const createSponsorship = (body: SponsorshipPayload) =>
  api.post<{ success: boolean; id: string }>('/swayam/sponsorships', body).then((r) => r.data);

export const updateSponsorship = (id: string, body: SponsorshipPayload) =>
  api.put<{ success: boolean; id: string }>(`/swayam/sponsorships/${id}`, body).then((r) => r.data);

export const markSponsorshipDone = (id: string) =>
  api.post<{ success: boolean; id: string }>(`/swayam/sponsorships/${id}/done`, {}).then((r) => r.data);

export const revertSponsorship = (id: string) =>
  api.post<{ success: boolean; id: string }>(`/swayam/sponsorships/${id}/revert`, {}).then((r) => r.data);
