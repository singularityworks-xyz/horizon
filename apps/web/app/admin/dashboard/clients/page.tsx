import { redirect } from 'next/navigation';
import { authServer } from '@/lib/auth-server';
import { prisma } from '@horizon/db';
import { ClientsTable } from '@/components/admin/clients-table';
import { InviteClientButton } from '@/components/admin/invite-client-button';
import { Users } from 'lucide-react';

export default async function AdminClientsPage() {
  const session = await authServer.getSession();
  const user = session?.user;

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch all clients from database
  const clients = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  // Transform data for the table component
  const clientsData = clients.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    createdAt: client.createdAt,
    projectCount: 0, // TODO: Count projects per client
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground">
              Manage your client accounts and invitations
            </p>
          </div>
        </div>
        <InviteClientButton />
      </div>

      {/* Clients Table */}
      <ClientsTable clients={clientsData} />
    </div>
  );
}
