import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { authServer } from '@/lib/auth-server';
import { getClientIdentity } from '@/lib/data-fetchers';
import { ClientHeader } from '@/components/admin/client-detail/client-header';
import { MetricsContainer } from '@/components/admin/client-detail/metrics-container';
import { ProjectsContainer } from '@/components/admin/client-detail/projects-container';
import { QuestionnairesContainer } from '@/components/admin/client-detail/questionnaires-container';
import { MetricsSkeleton, TableSkeleton } from '@/components/admin/client-detail/skeletons';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const session = await authServer.getSession();
  if (!session?.user) {
    redirect('/auth/login');
  }

  const { id } = await params;

  // Fast fetch: Just the identity for the header
  const client = await getClientIdentity(id);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Fast Shell: Header renders immediately after client identity fetch */}
      <ClientHeader
        client={{
          id: client.id,
          name: client.name,
          email: client.email,
          createdAt: client.createdAt,
        }}
      />

      {/* Streaming Section: Metrics pop in when ready */}
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsContainer email={client.email} />
      </Suspense>

      {/* Streaming Section: Projects pop in when ready */}
      <Suspense fallback={<TableSkeleton rows={3} />}>
        <ProjectsContainer email={client.email} />
      </Suspense>

      {/* Streaming Section: Questionnaires pop in when ready */}
      <Suspense fallback={<TableSkeleton rows={2} />}>
        <QuestionnairesContainer email={client.email} />
      </Suspense>
    </div>
  );
}
