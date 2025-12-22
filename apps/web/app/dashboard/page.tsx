import { authServer } from '@/lib/auth-server';
import { prisma } from '@horizon/db';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await authServer.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Get user role from DB to ensure accuracy
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user) {
    // User exists in session but not in DB (orphaned session).
    // Redirect to sign-out to clear the session cookie.
    // We can use the api route typically, or just redirect to login if we can't force signout here.
    // Better auth usually has a signout endpoint.
    // Redirect to login. The user will have to manually sign out or their new login will overwrite the cookie.
    redirect('/auth/login');
  }

  if (user.role === 'ADMIN') {
    redirect('/dashboard/admin');
  } else {
    // Default to client dashboard
    redirect('/dashboard/client');
  }
}
