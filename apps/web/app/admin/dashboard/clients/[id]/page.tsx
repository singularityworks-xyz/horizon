import { redirect, notFound } from 'next/navigation';
import { authServer } from '@/lib/auth-server';
import { prisma } from '@horizon/db';
import { ClientHeader } from '@/components/admin/client-detail/client-header';
import { ClientMetrics } from '@/components/admin/client-detail/client-metrics';
import { ProjectsOverview } from '@/components/admin/client-detail/projects-overview';
import { QuestionnairesSection } from '@/components/admin/client-detail/questionnaires-section';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const session = await authServer.getSession();
  const user = session?.user;

  if (!user) {
    redirect('/auth/login');
  }

  const { id } = await params;

  // Fetch client from user table
  const client = await prisma.user.findUnique({
    where: { id, role: 'CLIENT' },
  });

  if (!client) {
    notFound();
  }

  // Try to find linked client record for projects
  // First check if there's a client in the clients table with matching email
  const linkedClient = await prisma.clients.findFirst({
    where: { email: client.email },
    include: {
      projects: {
        include: {
          workflows: {
            include: {
              phases: true,
            },
          },
          questionnaire_submissions: {
            include: {
              template: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Get projects data
  const projects = linkedClient?.projects || [];

  // Calculate metrics
  const totalProjects = projects.length;
  const inProgress = projects.filter((p) => p.status === 'ACTIVE').length;
  const completed = projects.filter((p) => p.status === 'COMPLETED').length;
  const onHold = projects.filter((p) => p.status === 'ON_HOLD').length;

  // Transform projects for the component
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

  // Get questionnaire submissions
  const submissions = projects.flatMap((project) =>
    project.questionnaire_submissions.map((sub) => ({
      id: sub.id,
      templateName: sub.template.name,
      projectName: project.name,
      status: sub.status,
      submittedAt: sub.submittedAt,
      createdAt: sub.createdAt,
    }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <ClientHeader
        client={{
          id: client.id,
          name: client.name,
          email: client.email,
          createdAt: client.createdAt,
        }}
      />

      {/* Metrics */}
      <ClientMetrics
        totalProjects={totalProjects}
        inProgress={inProgress}
        completed={completed}
        onHold={onHold}
      />

      {/* Projects Overview */}
      <ProjectsOverview projects={projectsData} />

      {/* Questionnaires */}
      <QuestionnairesSection submissions={submissions} />
    </div>
  );
}
