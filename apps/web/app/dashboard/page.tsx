'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Get user role from headers (injected by proxy)
    const userRole = document.cookie
      .split('; ')
      .find((row) => row.startsWith('user-role='))
      ?.split('=')[1];

    // Redirect based on role
    if (userRole === 'ADMIN') {
      router.push('/dashboard/admin');
    } else if (userRole === 'CLIENT') {
      router.push('/dashboard/client');
    } else {
      // If no role found, redirect to login
      router.push('/auth/login');
    }
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    </div>
  );
}
