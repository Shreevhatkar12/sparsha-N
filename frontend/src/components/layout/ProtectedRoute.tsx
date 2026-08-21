import React, { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AnnouncementPopup } from './AnnouncementPopup';

// Define the roles based on your Prisma Schema
type UserRole = 'super_admin' | 'center_admin' | 'supervisor' | 'teacher' | 'staff' | 'volunteer' | 'student' | 'parent' | 'shareholder' | 'tech_admin';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.currentUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // mobile drawer
  const [isDesktopOpen, setIsDesktopOpen] = useState(true); // desktop collapse toggle
  const location = useLocation();

  // ☰ button: mobile → open the drawer; desktop → collapse / expand the sidebar.
  const handleMenuClick = () => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setIsDesktopOpen((v) => !v);
    } else {
      setIsSidebarOpen(true);
    }
  };

  // 1. Authentication Check
  if (!accessToken || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Authorization Check
  if (allowedRoles && !allowedRoles.includes(currentUser.role as UserRole)) {
    console.log(`BOUNCE: Role mismatch! Redirecting to a safe page. ${currentUser.role} tried to access ${location.pathname}`);
    
    // Redirect to /students instead, which is accessible to everyone authenticated.
    return <Navigate to="/students" replace />;
  }

  // 3. Layout Rendering
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100">
      <Sidebar isOpen={isSidebarOpen} isDesktopOpen={isDesktopOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar onMenuClick={handleMenuClick} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet key={location.pathname} />
        </main>
      </div>

      {/* Unread announcements pop up as an alert the user must acknowledge. */}
      <AnnouncementPopup />
    </div>
  );
};