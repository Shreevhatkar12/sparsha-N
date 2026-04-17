import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../ui/Button';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Star,
  Briefcase,
  GraduationCap,
  BarChart3,
  Settings,
  X,
  FileText,
  UserCog,
} from 'lucide-react';
import { getDashboardPending, type DashboardPendingCounts } from '../../services/reports.service';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialPending: DashboardPendingCounts = {
  missingAttendance: 0,
  incompleteExams: 0,
  pendingForms: 0,
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const [pending, setPending] = useState<DashboardPendingCounts>(initialPending);

  useEffect(() => {
    let alive = true;
    getDashboardPending()
      .then((p) => {
        if (alive) setPending(p);
      })
      .catch(() => {
        if (alive) setPending(initialPending);
      });
    const t = window.setInterval(() => {
      getDashboardPending()
        .then((p) => {
          if (alive) setPending(p);
        })
        .catch(() => {});
    }, 120000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const totalPending =
    pending.missingAttendance + pending.incompleteExams + pending.pendingForms;

  const navItems: Array<{
    name: string;
    path: string;
    icon: React.ReactNode;
    badge?: number;
    viewRoles: string[];
  }> = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, viewRoles: ['super_admin','center_admin','supervisor','teacher','staff','volunteer','student','parent'] },
    { name: 'Students', path: '/students', icon: <Users size={20} />, viewRoles: ['super_admin','center_admin','supervisor','teacher','staff'] },
    { name: 'Attendance', path: '/attendance', icon: <ClipboardCheck size={20} />, badge: pending.missingAttendance, viewRoles: ['super_admin','center_admin','supervisor','teacher','staff','volunteer'] },
    { name: 'Exams', path: '/exams', icon: <GraduationCap size={20} />, badge: pending.incompleteExams, viewRoles: ['super_admin','center_admin','supervisor','teacher'] },
    { name: 'Forms', path: '/forms', icon: <FileText size={20} />, badge: pending.pendingForms, viewRoles: ['super_admin','center_admin','supervisor','teacher','staff','volunteer','student','parent'] },
    { name: 'Activities', path: '/activities', icon: <Briefcase size={20} />, viewRoles: ['super_admin','center_admin','supervisor','teacher','staff'] },
    { name: 'Skills', path: '/skills', icon: <Star size={20} />, viewRoles: ['super_admin','center_admin','supervisor','teacher','student','parent'] },
    { name: 'Equipment', path: '/equipment', icon: <Briefcase size={20} />, viewRoles: ['super_admin','center_admin','supervisor'] },
    { name: 'Messages', path: '/messages', icon: <Star size={20} />, viewRoles: ['super_admin','center_admin','supervisor','teacher','staff','volunteer','student','parent'] },
    { name: 'Announcements', path: '/announcements', icon: <LayoutDashboard size={20} />, viewRoles: ['super_admin','center_admin','supervisor','teacher','staff'] },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} />, viewRoles: ['super_admin','center_admin','supervisor','shareholder'] },
    { name: 'Users', path: '/users', icon: <UserCog size={20} />, viewRoles: ['super_admin','center_admin'] },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} />, viewRoles: ['super_admin','tech_admin'] },
  ];

  const visibleItems = navItems.filter(item => currentUser?.role && item.viewRoles.includes(currentUser.role));

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/50 z-30 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 bg-white border-r border-neutral-200 w-[240px] z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-100">
          <span className="font-bold text-xl text-primary tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            SPARSHA
          </span>
          <button
            onClick={onClose}
            className="md:hidden p-1 text-neutral-400 hover:text-neutral-600 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-brand-50 text-brand-800 border border-brand-100'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                )
              }
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="transition-colors shrink-0">{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </span>
              {item.badge != null && item.badge > 0 && (
                <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-600 text-white text-[10px] font-semibold flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-100 bg-brand-50/40">
          <div className="bg-white rounded-xl p-3 border border-brand-100 shadow-sm">
            <span className="text-xs uppercase tracking-wider text-brand-800 font-bold flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
              Pending
            </span>
            <p className="text-xs text-neutral-600">
              {totalPending > 0
                ? `${totalPending} open item(s) across attendance, exams, and forms.`
                : 'No pending items in the current scope.'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
