'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Search, ChevronDown, LogOut, Circle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { LogoutButton } from '@/components/auth/logout-button';

interface NavbarProps {
  user?: {
    email?: string | null;
    name?: string | null;
    role?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAppRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard');

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

  // Get user initials
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

  const initials = user ? getInitials(user.name, user.email) : 'U';

  return (
    <nav className="w-full border-b border-border bg-background backdrop-blur-md sticky top-0 z-50">
      <div
        className={`${isAppRoute ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto px-6 h-16 flex items-center justify-between gap-4`}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tighter text-foreground"
        >
          {/* Use the Circle Logo if in App Mode for consistency, or just text? 
                 The wireframe showed a circle logo. The landing page just text.
                 Let's use the wireframe style (Icon + Text) everywhere for consistency.
             */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Circle className="w-5 h-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span>HORIZON</span>
        </Link>

        {/* Center: Search Bar (Only visible in App Routes) */}
        {isAppRoute && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <label htmlFor="navbar-search" className="sr-only">
                Search
              </label>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="navbar-search"
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-input rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>
        )}

        {/* Right Side: Actions */}
        <div className="flex items-center gap-4">
          <ThemeToggle />

          {user ? (
            // Authenticated State
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 hover:bg-muted/50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-border"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">{initials}</span>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-foreground leading-none">
                    {user.name || 'User'}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg shadow-black/20 p-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-2 border-b border-border/50 mb-1 block md:hidden">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name || user.email || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {user.role || 'Role'}
                    </p>
                  </div>

                  <LogoutButton className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-lg transition-colors cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </LogoutButton>
                </div>
              )}
            </div>
          ) : (
            // Guest State
            !isAppRoute && (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Get Started
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
