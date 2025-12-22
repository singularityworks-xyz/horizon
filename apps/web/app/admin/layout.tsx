import { authServer } from '@/lib/auth-server';
import { prisma } from '@horizon/db';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await authServer.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Double check role from DB for security
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== 'ADMIN') {
    // If authenticated but not admin, redirect to client dashboard or home
    redirect('/dashboard');
  }

  return <>{children}</>;
}
