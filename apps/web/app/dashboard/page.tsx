import { authServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { ClientOverview } from '@/components/dashboard/ClientOverview';

export default async function DashboardPage() {
  const session = await authServer.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session.user as any).role;

  if (userRole === 'ADMIN') {
    redirect('/admin/dashboard');
  }

  return <ClientOverview />;
}
