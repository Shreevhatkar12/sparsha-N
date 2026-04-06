import { apiClient } from '../lib/apiClient';
import type {
  AuthMeResponse,
  LoginResponse,
  RegisterResponse,
} from '../types/api';

export const authApi = {
  async login(payload: { identifier: string; password: string }): Promise<LoginResponse> {
    // Backend currently expects `email`; map identifier for forward compatibility.
    const response = await apiClient.post<LoginResponse>('/api/auth/login', {
      email: payload.identifier,
      password: payload.password,
    });
    return response.data;
  },

  async register(payload: {
    phone: string;
    email?: string;
    password: string;
  }): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/api/auth/register', payload);
    return response.data;
  },

  async refresh(token: string): Promise<{ token: string }> {
    const response = await apiClient.post<{ token: string }>('/api/auth/refresh', { token });
    return response.data;
  },

  async me(): Promise<AuthMeResponse> {
    const response = await apiClient.get<AuthMeResponse>('/api/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },
};
