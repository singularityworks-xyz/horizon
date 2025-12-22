import { authServer } from '@/lib/auth-server';
import { prisma } from '@horizon/db';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await authServer.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Check role from session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session.user as any).role;

  if (userRole !== 'ADMIN') {
    // If authenticated but not admin, redirect to client dashboard or home
    redirect('/dashboard');
  }

  return <>{children}</>;
}
