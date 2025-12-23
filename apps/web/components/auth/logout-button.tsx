'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authHelpers } from '@/lib/auth-client';

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await authHelpers.signOut();
      // Use window.location.href to force a full page reload and clear any client-side state
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback redirect even if signOut API fails
      window.location.href = '/auth/login';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleLogout} disabled={isLoading} className={className}>
      {isLoading ? 'Logging out...' : children || 'Logout'}
    </button>
  );
}
