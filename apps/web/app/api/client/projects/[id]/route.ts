import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import { apiErrors, guards } from '@/lib/security/guards';

// GET /api/client/projects/[id] - Individual project dashboard data
export const GET = guards.clientAccess(async (request, context, params) => {
  try {
    const id = params?.id || new URL(request.url).searchParams.get('id');

    const project = await prisma.projects.findFirst({
      where: {
        id,
        tenantId: context.tenantId, // Ensure tenant isolation
      },
      include: {
        questionnaire_submissions: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            lockedAt: true,
            questionnaire_templates: {
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
            workflow_snapshot_progress: true,
            workflow_snapshot_phases: {
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
      return apiErrors.notFound('Project not found');
    }

    // Build questionnaire data
    const latestSubmission = (project as any).questionnaire_submissions?.[0];
    let questionnaire = null;
    if (latestSubmission) {
      try {
        // Defensive calculation with proper property name and null checks
        const totalQuestions = latestSubmission?.questionnaire_templates?.questions?.length || 0;
        const answeredQuestions = Array.isArray(latestSubmission.answers)
          ? latestSubmission.answers.length
          : 0;

        // Validate data integrity and log warnings
        if (totalQuestions === 0) {
          console.warn('Project has submission but no questions:', {
            projectId: id,
            submissionId: latestSubmission.id,
            hasTemplate: !!latestSubmission.questionnaire_templates,
            templateId: latestSubmission.questionnaire_templates?.id,
          });
        }

        const completionPercent =
          totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

        questionnaire = {
          status: latestSubmission.status,
          submittedAt: latestSubmission.submittedAt,
          completionPercent,
        };
      } catch (error) {
        console.error('Error calculating questionnaire progress:', {
          projectId: id,
          submissionId: latestSubmission.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Fallback: provide questionnaire data without progress calculation
        questionnaire = {
          status: latestSubmission.status,
          submittedAt: latestSubmission.submittedAt,
          completionPercent: 0,
          warning: 'Unable to calculate progress',
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
        uploadedAt: asset.createdAt,
      })),
    };

    // Build workflow snapshot data
    const currentSnapshot = (project as any).workflow_snapshots?.[0];
    let workflowSnapshot = null;
    if (currentSnapshot?.workflow_snapshot_progress) {
      const { totalTasks, completedTasks, perPhase } =
        currentSnapshot.workflow_snapshot_progress as any;

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
    const projectData = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      questionnaire,
      assets,
      workflowSnapshot,
    };

    return NextResponse.json(projectData);
  } catch (error) {
    console.error('Failed to fetch project details:', error);
    return apiErrors.internalError('Failed to fetch project details');
  }
});
