import { authServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await authServer.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // We don't necessarily strictly forbid Admins from seeing client view if they want to,
  // but per request "separate for user and admin", we could enforce it.
  // For now, let's ensuring at least a session exists is handled by root layout,
  // but let's strictly redirect Admins back to Admin dashboard to prevent confusion?
  // Or maybe allow them.
  // The prompt said: "All the pages ... will have different admin routes which can only be accessed by the ADMIN ONLY."
  // It didn't explicitly say "Clients routes can only be accessed by CLIENT ONLY".
  // But usually you want that separation.

  // Let's implement strict separation for now to match the "2 dashboards" mental model.

  /*
  // Optional: Strict check for CLIENT role
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    redirect('/dashboard/admin');
  }
  */

  // Actually, let's keep it simple. Access to /dashboard/client is for the "Client App".
  // If an Admin goes there, they might see the app as a client would. That's useful for testing.
  // So I won't block Admins from Client routes, but I WILL block Clients from Admin routes.

  return <>{children}</>;
}
