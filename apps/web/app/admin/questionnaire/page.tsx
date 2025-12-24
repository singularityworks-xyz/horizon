import { redirect } from 'next/navigation';
import { authServer } from '@/lib/auth-server';
import { prisma } from '@horizon/db';
import { ClipboardList, Search } from 'lucide-react';
import { QuestionnaireGrid } from '@/components/admin/questionnaire-grid';
import { validateUserHasTenantAccess } from '@/lib/security/tenant';

export default async function AdminQuestionnairePage() {
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

  // Fetch all questionnaire templates
  const templates = await prisma.questionnaire_templates.findMany({
    where: {
      tenantId: tenantContext.tenantId,
    },
    include: {
      projects: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          questions: true,
          questionnaire_submissions: true,
        },
      },
    },
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
  });

  // Transform for the client component
  const questionnairesData = templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    tags: template.projects ? [template.projects.name] : [],
    questionCount: template._count.questions,
    submissionCount: template._count.questionnaire_submissions,
    isActive: template.isActive,
    createdAt: template.createdAt,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Questionnaires</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage questionnaires for your clients
            </p>
          </div>
        </div>
      </div>

      {/* Questionnaires Grid */}
      <QuestionnaireGrid questionnaires={questionnairesData} tenantId={tenantContext.tenantId} />
    </div>
  );
}
