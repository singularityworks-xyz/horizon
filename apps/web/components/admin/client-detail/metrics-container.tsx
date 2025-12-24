import { getClientDetailData } from '@/lib/data-fetchers';
import { ClientMetrics } from './client-metrics';

export async function MetricsContainer({ email }: { email: string }) {
  const linkedClient = await getClientDetailData(email);
  const projects = linkedClient?.projects || [];

  const metrics = {
    totalProjects: projects.length,
    inProgress: projects.filter((p) => p.status === 'ACTIVE').length,
    completed: projects.filter((p) => p.status === 'COMPLETED').length,
    onHold: projects.filter((p) => p.status === 'ON_HOLD').length,
  };

  return <ClientMetrics {...metrics} />;
}
