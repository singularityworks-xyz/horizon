import { redirect } from 'next/navigation';
import { authServer } from '@/lib/auth-server';
import { prisma } from '@horizon/db';
import { notFound } from 'next/navigation';
import { QuestionnaireDetail } from '@/components/admin/questionnaire-detail';
import { validateUserHasTenantAccess } from '@/lib/security/tenant';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuestionnaireDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await authServer.getSession();
  const user = session?.user;

  if (!user) {
    redirect('/auth/login');
  }

  // Validate tenant access
  let tenantContext;
  try {
    tenantContext = await validateUserHasTenantAccess(user.id);
  } catch (error) {
    console.error('Tenant access validation failed:', error);
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <p className="text-muted-foreground">
          Failed to load tenant information. Please contact support.
        </p>
      </div>
    );
  }

  // Fetch the questionnaire template with questions
  const template = await prisma.questionnaire_templates.findFirst({
    where: {
      id,
      tenantId: tenantContext.tenantId,
    },
    include: {
      projects: {
        select: { id: true, name: true },
      },
      questions: {
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: { answers: true },
          },
        },
      },
      _count: {
        select: { questionnaire_submissions: true },
      },
    },
  });

  if (!template) {
    notFound();
  }

  // Transform for client component
  const questionnaireData = {
    id: template.id,
    name: template.name,
    description: template.description,
    isActive: template.isActive,
    version: template.version,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    project: template.projects,
    submissionCount: template._count.questionnaire_submissions,
    questions: template.questions.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      description: q.description,
      config: q.config as Record<string, unknown> | null,
      order: q.order,
      required: q.required,
      answerCount: q._count.answers,
    })),
  };

  return <QuestionnaireDetail questionnaire={questionnaireData} />;
}
