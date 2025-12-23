'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, LogOut } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';

interface DashboardHeaderProps {
  user: {
    email?: string | null;
    name?: string | null;
    role?: string;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user initials for avatar
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const initials = getInitials(user.name, user.email);

  return (
    <div className="flex items-center justify-between gap-4 mb-8">
      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* User Profile */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-4 hover:bg-card p-2 rounded-xl transition-colors border border-transparent hover:border-border"
        >
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-foreground">
              {user.name || user.email || 'User'}
            </p>
            <p className="text-xs text-muted-foreground font-medium">{user.role || 'Admin Role'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">{initials}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg shadow-black/20 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 border-b border-border/50 mb-1 block md:hidden">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name || user.email || 'User'}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                {user.role || 'Admin Role'}
              </p>
            </div>

            <LogoutButton className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 rounded-lg transition-colors cursor-pointer">
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </LogoutButton>
          </div>
        )}
      </div>
    </div>
  );
}
