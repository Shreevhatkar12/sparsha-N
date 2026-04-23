import api from './api';
import type { CenterSummary, ProgramSummary } from '../types';

export const listCenters = () =>
  api.get<{ centers: CenterSummary[] }>('/centers').then((r) => r.data.centers);

export const createCenter = (data: { name: string; location?: string }) =>
  api.post<{ center: CenterSummary }>('/centers', data).then((r) => r.data.center);

export const deleteCenter = (centerId: string) =>
  api.delete(`/centers/${centerId}`);

export const listPrograms = () => api.get<ProgramSummary[]>('/programs').then((r) => r.data);
