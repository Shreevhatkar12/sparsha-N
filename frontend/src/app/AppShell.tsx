import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            S
          </div>
          <div>
            <p className="brand-title">Sparsha NGO</p>
            <p className="brand-subtitle">Student Impact Platform</p>
          </div>
        </div>
        <div className="topbar-actions">
          <p className="user-chip">{user?.fullName ?? user?.email}</p>
          <button className="btn-primary" type="button" onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </header>

      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Dashboard
        </NavLink>
        <NavLink
          to="/students"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Students
        </NavLink>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
