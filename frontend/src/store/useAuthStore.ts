import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher';
  centerIds: string[];
  name?: string;
}

interface AuthState {
  currentUser: User | null;
  accessToken: string | null;
  selectedCenterId: string | null;
  
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  setSelectedCenterId: (id: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  accessToken: null,
  selectedCenterId: null,

  setAuth: (user, token) => set({ 
    currentUser: user, 
    accessToken: token, 
    // Default to the first center for teachers if they have any assigned,
    // otherwise it stays null.
    selectedCenterId: user.centerIds.length > 0 ? user.centerIds[0] : null
  }),
  
  setAccessToken: (token) => set({ accessToken: token }),
  
  setSelectedCenterId: (id) => set({ selectedCenterId: id }),

  logout: () => set({ currentUser: null, accessToken: null, selectedCenterId: null }),
}));
