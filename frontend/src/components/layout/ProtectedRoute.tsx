import React, { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

// Define the roles based on your Prisma Schema
type UserRole = 'super_admin' | 'center_admin' | 'supervisor' | 'teacher' | 'staff' | 'volunteer' | 'student' | 'parent' | 'shareholder' | 'tech_admin';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.currentUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // 1. Authentication Check: Is the user logged in?
  if (!accessToken || !currentUser) {
    // Redirect to login but save the current location so we can go back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Authorization Check: Does the user have the right role?
  // If allowedRoles is provided, check if the user's role is included in that list
  console.log("Current User Role:", currentUser.role);
console.log("Allowed Roles:", allowedRoles);
  if (allowedRoles && !allowedRoles.includes(currentUser.role as UserRole)) {
    // If they don't have permission, send them to the dashboard
    console.log("BOUNCE: Role mismatch!");
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Layout Rendering
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100">
      {/* Shared Navigation Components */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};