import { createContext } from 'react';
import type { AuthUser } from '../../types/api';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (params: { identifier: string; password: string }) => Promise<void>;
  register: (params: { phone: string; email?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
