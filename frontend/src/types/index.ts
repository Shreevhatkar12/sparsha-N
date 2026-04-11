/** Shapes aligned with backend JSON where stable; extend as needed. */

export type Gender = 'male' | 'female' | 'other';

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type ExamType = 'baseline' | 'endline';

export interface CenterSummary {
  id: string;
  name: string;
  location?: string | null;
}

export interface ProgramSummary {
  id: string;
  code: string;
  name: string;
}

/** Student row from Prisma-backed list/detail endpoints */
export interface Student {
  id: string;
  fullName: string;
  dob?: string | null;
  gender?: Gender | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  enrollmentDate?: string;
  isActive?: boolean;
  centerId: string;
  programId: string;
  center?: CenterSummary;
  program?: ProgramSummary;
  createdAt?: string;
}

export interface StudentsListResult {
  students: Student[];
  total: number;
  page: number;
  totalPages: number;
}

export interface StudentCreatePayload {
  fullName: string;
  dob?: string;
  gender?: Gender;
  guardianName?: string;
  guardianPhone?: string;
  centerId: string;
  programId: string;
}

export interface StudentUpdatePayload {
  fullName?: string;
  dob?: string;
  gender?: Gender;
  guardianName?: string;
  guardianPhone?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/** Legacy / nested student routes often wrap payloads */
export type SkillRecord = Record<string, unknown>;
export type CareerRecord = Record<string, unknown>;
export type AttendanceRecordPayload = Record<string, unknown>;

/** `GET /api/students/:id/profile` — aggregated charts and relations */
export interface StudentProfilePayload {
  student: Student & { parents?: unknown[] };
  stats: {
    attendancePct: number;
    avgExamPct: number | null;
    skillScore: number | null;
  };
  attendanceTrend: { date: string; present: number }[];
  examComparison: { subject: string; baseline: number | null; endline: number | null }[];
  skillRadar: { skill: string; score: number }[];
  formSubmissions: Array<{
    id: string;
    createdAt: string;
    data: unknown;
    template?: { id: string; name: string; formType: string };
    templateId?: string;
  }>;
  parents: Array<{
    parent?: { fullName?: string | null; email?: string | null; phone?: string | null };
  }>;
}
