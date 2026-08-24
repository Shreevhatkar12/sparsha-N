import api from './api';

// ---------------- Sehat (Health) module types ----------------

export type CampAudience = 'student' | 'parent';

export type SehatCamp = {
  id: string;
  hospital: string;
  doctors: string[];
  date: string;
  time: string;
  area: string;
  centerIds: string[];
  programIds: string[];
  centerNames?: string[];
  programNames?: string[];
  audience: CampAudience | string;
  campType: string;
  participated: number;
  absent: number;
  totalRecords: number;
  submittedAt?: string;
};

export type SehatCounts = {
  totalCamps: number;
  studentCamps: number;
  parentCamps: number;
  studentsParticipated: number;
  parentsParticipated: number;
};

export type SehatListResponse = {
  camps: SehatCamp[];
  counts: SehatCounts;
  campTypes: string[];
};

// One student's record inside a camp. Yes/No fields hold 'yes' | 'no'.
export type SehatRecord = {
  absent?: boolean;
  height?: string;
  weight?: string;
  age?: string;
  remark?: string;
  rightEye?: string;
  leftEye?: string;
  hb?: string;
  bp?: string;
  parentName?: string;
  handgrip?: string;
  eye?: string;
  nose?: string;
  mouth?: string;
  ear?: string;
  throat?: string;
  teeth?: string;
  specs?: string;
  medicine?: string;
  problem?: string;
};

export type CampRosterStudent = {
  id: string;
  fullName: string;
  rollNumber: string | null;
  standard: string | null;
  center?: { id: string; name: string };
};

export type CampRosterResponse = {
  camp: SehatCamp;
  students: CampRosterStudent[];
  records: Record<string, SehatRecord>;
};

export type CampPayload = {
  hospital: string;
  doctors: string[];
  date: string;
  time?: string;
  area?: string;
  centerIds: string[];
  programIds: string[];
  audience: CampAudience;
  campType: string;
  records?: Record<string, SehatRecord>;
};

export type SehatDashboardData = {
  counts: SehatCounts;
  byType: Array<{ type: string; camps: number; participated: number }>;
  recent: Array<{
    id: string;
    campType: string;
    audience: string;
    date: string;
    hospital: string;
    participated: number;
  }>;
};

// ---------------- API calls ----------------

export const listSehatCamps = () =>
  api.get<SehatListResponse>('/sehat/camps').then((r) => r.data);

export const createSehatCamp = (payload: CampPayload) =>
  api.post<{ id: string }>('/sehat/camps', payload).then((r) => r.data);

export const updateSehatCamp = (id: string, payload: Partial<CampPayload>) =>
  api.put<{ id: string }>(`/sehat/camps/${id}`, payload).then((r) => r.data);

export const deleteSehatCamp = (id: string) =>
  api.delete<{ success: boolean }>(`/sehat/camps/${id}`).then((r) => r.data);

export const getSehatCampRoster = (id: string) =>
  api.get<CampRosterResponse>(`/sehat/camps/${id}`).then((r) => r.data);

export const getSehatDashboard = () =>
  api.get<SehatDashboardData>('/sehat/dashboard').then((r) => r.data);
