import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { apiErrors, guards } from '@/lib/security/guards';

// GET /api/client/projects - List client's projects (read-only)
export const GET = guards.clientAccess(async (request, context, params) => {
  try {
    const tenantId = context.tenantId;
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
            progress: true,
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
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    });

    return NextResponse.json({ projects: clientProjects });
  } catch (error) {
    console.error('Failed to fetch client projects:', error);
    return apiErrors.internalError('Failed to fetch projects');
  }
});
