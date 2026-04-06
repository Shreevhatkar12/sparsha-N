import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../../api/authApi';
import { configureAuthHandlers } from '../../lib/apiClient';
import { tokenStore } from '../../lib/tokenStore';
import type { AuthUser } from '../../types/api';
import { AuthContext, type AuthContextValue } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const forceLogout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const token = tokenStore.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    const refreshed = await authApi.refresh(token);
    tokenStore.setAccessToken(refreshed.token);
    return refreshed.token;
  }, []);

  useEffect(() => {
    configureAuthHandlers({
      onRefresh: refresh,
      onUnauthorized: forceLogout,
    });
  }, [refresh, forceLogout]);

  const login = useCallback(async (params: { identifier: string; password: string }) => {
    const response = await authApi.login(params);
    tokenStore.setAccessToken(response.token);
    setUser(response.user);
  }, []);

  const register = useCallback(
    async (params: { phone: string; email?: string; password: string }) => {
      const response = await authApi.register(params);
      tokenStore.setAccessToken(response.data.token);
      setUser(response.data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      forceLogout();
    }
  }, [forceLogout]);

  useEffect(() => {
    const bootstrap = async () => {
      const token = tokenStore.getAccessToken();
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const me = await authApi.me();
        setUser(me.user);
      } catch {
        forceLogout();
      } finally {
        setIsBootstrapping(false);
      }
    };

    void bootstrap();
  }, [forceLogout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
    }),
    [user, isBootstrapping, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
