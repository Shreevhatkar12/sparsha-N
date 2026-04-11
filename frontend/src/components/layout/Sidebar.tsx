import React from 'react';
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
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const currentUser = useAuthStore(state => state.currentUser);
  const isAdmin = currentUser?.role === 'admin';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Students', path: '/students', icon: <Users size={20} /> },
    { name: 'Attendance', path: '/attendance', icon: <ClipboardCheck size={20} /> },
    { name: 'Skills', path: '/skills', icon: <Star size={20} /> },
    { name: 'Careers', path: '/careers', icon: <Briefcase size={20} /> },
    { name: 'Exams', path: '/exams', icon: <GraduationCap size={20} /> },
    { name: 'Forms', path: '/forms', icon: <FileText size={20} /> },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> });
    navItems.push({ name: 'Settings', path: '/settings', icon: <Settings size={20} /> });
  }

  return (
    <>
      {/* Mobile backgrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900/50 z-30 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-white border-r border-neutral-200 w-64 z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-100">
          <span className="font-bold text-xl text-primary tracking-tight">SPARSHA</span>
          <button onClick={onClose} className="md:hidden p-1 text-neutral-400 hover:text-neutral-600 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <span className={cn(
                "transition-colors",
                // This will be active if NavLink injects isActive, but we can't style children generically without parent class trick in pure tailwind easily unless we use group-[]
                // However the wrapper handles text color, so svg inherits currentColor!
              )}>
                {item.icon}
              </span>
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
          <div className="bg-white rounded-xl p-3 border border-warning/20 shadow-sm">
            <span className="text-xs uppercase tracking-wider text-warning font-bold flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
              Alert
            </span>
            <p className="text-xs text-neutral-600">You have 3 pending tasks for today.</p>
          </div>
        </div>
      </aside>
    </>
  );
};
