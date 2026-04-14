import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const ProtectedRoute: React.FC = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.currentUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Zustand persist ensures these are fully populated before the first render if they exist in localStorage.
  // App.tsx guarantees that any background session refreshing has occurred or failed before rendering this route.
  if (!accessToken || !currentUser) {
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
