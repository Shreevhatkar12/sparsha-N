import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { getMe } from '../../services/auth.service';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const ProtectedRoute: React.FC = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [booting, setBooting] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('token')) && !useAuthStore.getState().accessToken;
  });

  useEffect(() => {
    const ls = localStorage.getItem('token');
    if (!ls || useAuthStore.getState().accessToken) {
      setBooting(false);
      return;
    }
    let alive = true;
    getMe()
      .then((user) => {
        if (!alive) return;
        setAuth(
          {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            centerIds: user.centerIds ?? [],
          },
          ls,
        );
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => {
        if (alive) setBooting(false);
      });
    return () => {
      alive = false;
    };
  }, [setAuth]);

  if (booting) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100">
        <LoadingSpinner label="Restoring session…" />
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the layout shell and the nested routes (Outlet)
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <Outlet />
      </div>
    </div>
  );
};
