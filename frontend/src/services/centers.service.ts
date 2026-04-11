import api from './api';
import type { CenterSummary, ProgramSummary } from '../types';

export const listCenters = () =>
  api.get<{ centers: CenterSummary[] }>('/centers').then((r) => r.data.centers);

export const listPrograms = () => api.get<ProgramSummary[]>('/programs').then((r) => r.data);
