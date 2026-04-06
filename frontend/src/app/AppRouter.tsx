import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { AppLayout } from './AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { StudentsPage } from '../pages/StudentsPage';
import { StudentDetailPage } from '../pages/StudentDetailPage';

function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  if (isBootstrapping) {
    return <p className="status-message">Loading session...</p>;
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  if (isBootstrapping) {
    return <p className="status-message">Loading session...</p>;
  }
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
