'use server';

import { prisma } from '@horizon/db';
import { authServer } from '@/lib/auth-server';

// Types matching the API response
export interface DashboardProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  questionnaireStatus: 'DRAFT' | 'SUBMITTED' | 'LOCKED' | null;
  assetCount: number;
  workflowProgress: {
    percentComplete: number;
    completedTasks: number;
    totalTasks: number;
    phaseBreakdown?: {
      phaseName: string;
      completed: number;
      total: number;
    }[];
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  questionnaire: {
    status: string;
    submittedAt: string | null;
    completionPercent: number;
  } | null;
  assets: {
    totalCount: number;
    recent: {
      id: string;
      name: string;
      type: string;
      uploadedAt: string;
    }[];
  };
  workflowSnapshot: {
    percentComplete: number;
    completedTasks: number;
    totalTasks: number;
    phaseBreakdown:
      | {
          phaseName: string;
          completed: number;
          total: number;
        }[]
      | null;
  } | null;
}

// Server action to get client projects
export async function getClientProjects(): Promise<{
  projects: DashboardProject[];
}> {
  // Get authenticated user context
  const session = await authServer.requireSession();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Get user's tenant context
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });

  if (!user?.tenantId) {
    throw new Error('User tenant not found');
  }

  const tenantId = user.tenantId;

  const projects = await prisma.projects.findMany({
    where: { tenantId },
    include: {
      workflows: {
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1, // Get the latest workflow
      },
      clients: {
        select: {
          id: true,
          name: true,
        },
      },
      questionnaire_submissions: {
        select: {
          id: true,
          status: true,
          submittedAt: true,
          lockedAt: true,
          template: {
            select: {
              questions: {
                select: {
                  id: true,
                },
              },
            },
          },
          answers: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1, // Get the latest submission
      },
      assets: {
        select: {
          id: true,
          name: true,
          mimeType: true,
          createdAt: true,
        },
      },
      workflow_snapshots: {
        where: { isCurrent: true },
        include: {
          progress: true as any, // Type assertion for Prisma relation
          phases: {
            include: {
              workflow_snapshot_tasks: true,
            },
          },
        },
        take: 1, // Get current snapshot only
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Transform response to be client-friendly with aggregated data
  const clientProjects = (projects as any).map((project: any) => {
    // Questionnaire status
    const latestSubmission = project.questionnaire_submissions?.[0];
    let questionnaireStatus: 'DRAFT' | 'SUBMITTED' | 'LOCKED' | null = null;
    if (latestSubmission) {
      questionnaireStatus = latestSubmission.status;
    }

    // Calculate questionnaire completion percentage
    let completionPercent = 0;
    if (latestSubmission) {
      // Defensive calculation with null checks
      const totalQuestions = (() => {
        if (!latestSubmission.template) {
          console.warn('No template found for project submission:', latestSubmission.id);
          return 0;
        }
        if (!Array.isArray(latestSubmission.template.questions)) {
          console.warn('Invalid questions array for project submission:', latestSubmission.id);
          return 0;
        }
        return latestSubmission.template.questions.length;
      })();

      const answeredQuestions = Array.isArray(latestSubmission.answers)
        ? latestSubmission.answers.length
        : 0;

      // Note: For simplicity, we're not counting answers here since it's complex
      // In a real implementation, you'd join with answers and count them
      completionPercent =
        totalQuestions > 0
          ? Math.min(100, Math.floor((answeredQuestions / totalQuestions) * 100))
          : 0;
    }

    // Asset count
    const assetCount = project.assets.length;

    // Workflow progress
    const currentSnapshot = (project as any).workflow_snapshots?.[0];
    let workflowProgress = null;
    if (currentSnapshot?.progress) {
      const { totalTasks, completedTasks, perPhase } = currentSnapshot.progress as any;

      // Calculate phase breakdown from perPhase data
      let phaseBreakdown = null;
      if (perPhase) {
        try {
          const parsedPerPhase = perPhase as Record<
            string,
            { total: number; completed: number; percentage: number }
          >;
          phaseBreakdown = Object.entries(parsedPerPhase).map(([phaseName, phaseData]) => ({
            phaseName,
            completed: phaseData.completed,
            total: phaseData.total,
          }));
        } catch (error) {
          console.error('Failed to parse perPhase data:', error);
          phaseBreakdown = null;
        }
      }

      workflowProgress = {
        percentComplete: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        completedTasks,
        totalTasks,
        phaseBreakdown,
      };
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      questionnaireStatus,
      assetCount,
      workflowProgress,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  });

  return { projects: clientProjects };
}

// Server action to get project details by ID
export async function getProjectById(projectId: string): Promise<ProjectDetail> {
  // Get authenticated user context
  const session = await authServer.requireSession();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Get user's tenant context
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });

  if (!user?.tenantId) {
    throw new Error('User tenant not found');
  }

  const tenantId = user.tenantId;

  const project = await prisma.projects.findFirst({
    where: {
      id: projectId,
      tenantId: tenantId, // Ensure tenant isolation
    },
    include: {
      questionnaire_submissions: {
        select: {
          id: true,
          status: true,
          submittedAt: true,
          lockedAt: true,
          template: {
            select: {
              questions: {
                select: {
                  id: true,
                },
              },
            },
          },
          answers: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1, // Get the latest submission
      },
      assets: {
        select: {
          id: true,
          name: true,
          mimeType: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5, // Recent uploads only
      },
      workflow_snapshots: {
        where: { isCurrent: true },
        include: {
          progress: true as any, // Type assertion for Prisma relation
          phases: {
            include: {
              workflow_snapshot_tasks: true,
            },
          },
        },
        take: 1, // Get current snapshot only
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Build questionnaire data
  const latestSubmission = (project as any).questionnaire_submissions?.[0];
  let questionnaire = null;
  if (latestSubmission) {
    try {
      // Defensive calculation with proper property name and null checks
      const totalQuestions = latestSubmission?.template?.questions?.length || 0;
      const answeredQuestions = Array.isArray(latestSubmission.answers)
        ? latestSubmission.answers.length
        : 0;

      // Validate data integrity and log warnings
      if (totalQuestions === 0) {
        console.warn('Project has submission but no questions:', {
          projectId,
          submissionId: latestSubmission.id,
          hasTemplate: !!latestSubmission.template,
          templateId: latestSubmission.template?.id,
        });
      }

      const completionPercent =
        totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

      questionnaire = {
        status: latestSubmission.status,
        submittedAt: latestSubmission.submittedAt
          ? latestSubmission.submittedAt.toISOString()
          : null,
        completionPercent,
      };
    } catch (error) {
      console.error('Error calculating questionnaire progress:', {
        projectId,
        submissionId: latestSubmission.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback: provide questionnaire data without progress calculation
      questionnaire = {
        status: latestSubmission.status,
        submittedAt: latestSubmission.submittedAt
          ? latestSubmission.submittedAt.toISOString()
          : null,
        completionPercent: 0,
      };
    }
  }

  // Build assets summary
  const assets = {
    totalCount: (project as any).assets.length,
    recent: (project as any).assets.map((asset: any) => ({
      id: asset.id,
      name: asset.name,
      type: asset.mimeType,
      uploadedAt: asset.createdAt.toISOString(),
    })),
  };

  // Build workflow snapshot data
  const currentSnapshot = (project as any).workflow_snapshots?.[0];
  let workflowSnapshot = null;
  if (currentSnapshot?.progress) {
    const { totalTasks, completedTasks, perPhase } = currentSnapshot.progress as any;

    // Calculate phase breakdown from perPhase data
    let phaseBreakdown = null;
    if (perPhase) {
      try {
        const parsedPerPhase = perPhase as Record<string, { total: number; completed: number }>;
        phaseBreakdown = Object.entries(parsedPerPhase).map(([phaseName, phaseData]) => ({
          phaseName,
          completed: phaseData.completed,
          total: phaseData.total,
        }));
      } catch (error) {
        console.warn('Failed to parse perPhase data:', error);
      }
    }

    workflowSnapshot = {
      percentComplete: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      completedTasks,
      totalTasks,
      phaseBreakdown,
    };
  }

  // Return client-safe project data
  const projectData: ProjectDetail = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
    questionnaire,
    assets,
    workflowSnapshot,
  };

  return projectData;
}
