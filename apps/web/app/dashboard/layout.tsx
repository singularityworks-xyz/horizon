import { authServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await authServer.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
