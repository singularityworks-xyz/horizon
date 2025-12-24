import { authServer } from '@/lib/auth-server';
import { prisma } from '@horizon/db';
import { redirect } from 'next/navigation';
import React from 'react';
import { Sidebar } from '@/components/admin/sidebar';
import { Navbar } from '@/components/navbar';

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

  const userData = {
    email: session.user.email,
    name: session.user.name,
    role: (session.user as any).role,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-6">
        <Navbar user={userData} />

        <div className="flex gap-6 py-6">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
