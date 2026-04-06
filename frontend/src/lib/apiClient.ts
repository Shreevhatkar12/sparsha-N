import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

type RefreshHandler = () => Promise<string>;
type LogoutHandler = () => void;

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

let refreshHandler: RefreshHandler | null = null;
let logoutHandler: LogoutHandler | null = null;
let isRefreshing = false;
let queuedRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const flushQueue = (error: unknown, token?: string) => {
  queuedRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(token ?? '');
  });
  queuedRequests = [];
};

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as RetryableConfig | undefined;
    if (!originalConfig || originalConfig._retry || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (!refreshHandler) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queuedRequests.push({
          resolve: (token: string) => {
            originalConfig.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalConfig));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshedToken = await refreshHandler();
      tokenStore.setAccessToken(refreshedToken);
      flushQueue(null, refreshedToken);
      originalConfig.headers.Authorization = `Bearer ${refreshedToken}`;
      return apiClient(originalConfig);
    } catch (refreshError) {
      tokenStore.clear();
      flushQueue(refreshError);
      if (logoutHandler) {
        logoutHandler();
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const configureAuthHandlers = (handlers: {
  onRefresh: RefreshHandler;
  onUnauthorized: LogoutHandler;
}) => {
  refreshHandler = handlers.onRefresh;
  logoutHandler = handlers.onUnauthorized;
};
