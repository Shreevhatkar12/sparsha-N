export type UserRole = 'admin' | 'teacher' | 'staff' | string;

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  centerIds: number[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    token: string;
  };
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface DashboardStats {
  totalStudents?: number;
  activeStudents?: number;
  attendanceRate?: number;
  [key: string]: number | string | undefined;
}

export interface Student {
  id: number;
  fullName?: string;
  name?: string;
  gender?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface StudentsResponse {
  data?: Student[];
  students?: Student[];
  total?: number;
  page?: number;
  totalPages?: number;
}
