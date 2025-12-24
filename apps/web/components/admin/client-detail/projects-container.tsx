import { getClientDetailData } from '@/lib/data-fetchers';
import { ProjectsOverview } from './projects-overview';

export async function ProjectsContainer({ email }: { email: string }) {
  const linkedClient = await getClientDetailData(email);
  const projects = linkedClient?.projects || [];

  const projectsData = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    progress: project.progress,
    workflowCount: project.workflows.length,
    phaseCount: project.workflows.reduce((acc, w) => acc + w.phases.length, 0),
    createdAt: project.createdAt,
  }));

  return <ProjectsOverview projects={projectsData} />;
}
