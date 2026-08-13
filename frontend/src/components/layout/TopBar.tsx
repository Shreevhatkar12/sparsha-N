import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Menu, UserCircle, LogOut } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
}

// Friendly role names for the top-right badge.
const displayRole = (r?: string | null) => {
  if (!r) return 'Guest';
  if (r === 'volunteer') return 'Staff';
  if (r === 'supervisor') return 'Swayam Coordinator';
  return r.replace(/_/g, ' ');
};

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { currentUser, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-neutral-200 h-16 flex items-center justify-between px-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          title="Sidebar open / close"
          aria-label="Toggle sidebar"
          className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 transition-colors"
        >
          <Menu size={24} />
        </button>
        <img
          src="/sparsha-logo.png"
          alt="Sparsha logo"
          draggable={false}
          className="h-9 w-9 rounded-full shadow-sm select-none shrink-0"
        />
        <span className="font-semibold text-lg text-primary hidden md:block">SPARSHA System</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-sm font-medium text-neutral-900">{currentUser?.email || 'User'}</span>
          <span className="text-xs text-neutral-500 capitalize">{displayRole(currentUser?.role)}</span>
        </div>
        
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
          <UserCircle size={20} />
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2 hover:bg-danger/10 text-neutral-400 hover:text-danger rounded-lg transition-colors ml-2"
          aria-label="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
