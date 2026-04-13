import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  role: string;
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
  initializeAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  accessToken: null,
  selectedCenterId: null,

  // 🔥 set full auth
  setAuth: (user, token) => {
    localStorage.setItem("accessToken", token);

    set({
      currentUser: user,
      accessToken: token,
      selectedCenterId:
        user.centerIds.length > 0 ? user.centerIds[0] : null,
    });
  },

  // 🔥 update token (used after refresh)
  setAccessToken: (token) => {
    localStorage.setItem("accessToken", token);
    set({ accessToken: token });
  },

  setSelectedCenterId: (id) => set({ selectedCenterId: id }),

  // 🔥 restore auth on page reload
  initializeAuth: () => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      set({ accessToken: token });
    }
  },

  // 🔥 logout properly
  logout: () => {
    localStorage.removeItem("accessToken");

    // call backend logout (clears cookie)
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    set({
      currentUser: null,
      accessToken: null,
      selectedCenterId: null,
    });
  },
}));