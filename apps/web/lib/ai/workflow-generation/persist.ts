// Step 5: Persist validated workflow
// Creates workflow, phases, tasks in transaction with audit trail

import { prisma } from '@horizon/db';
import type { AiExecutionContext, GeneratedWorkflowDraft } from './index';

export async function persistWorkflow(
  ctx: AiExecutionContext,
  submissionId: string,
  draft: GeneratedWorkflowDraft
): Promise<{
  workflowId?: string;
  errorMessage?: string;
}> {
  try {
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get submission details for audit
      const submission = await tx.questionnaire_submissions.findUnique({
        where: { id: submissionId },
        select: {
          projectId: true,
          tenantId: true,
        },
      });

      if (!submission || !submission.projectId) {
        throw new Error('Submission or project not found');
      }

      // Create workflow
      const workflow = await tx.workflows.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: ctx.tenantId,
          projectId: submission.projectId,
          name: draft.name,
          description: draft.description,
          source: 'AI_GENERATED',
          status: 'DRAFT', // AI workflows start as DRAFT until approved
          aiGeneratedFromSubmissionId: submissionId,
          updatedAt: new Date(),
          // aiApprovedAt: null (default), aiApprovedById: null (default)
        },
      });

      // Create phases and tasks
      for (const phaseData of draft.phases) {
        const phase = await tx.phases.create({
          data: {
            id: crypto.randomUUID(),
            workflowId: workflow.id,
            name: phaseData.name,
            intent: phaseData.intent as any, // Cast to Prisma enum
            description: phaseData.description,
            order: phaseData.order,
            source: 'AI_GENERATED',
            updatedAt: new Date(),
          },
        });

        // Create tasks for this phase
        for (const taskData of phaseData.tasks) {
          await tx.tasks.create({
            data: {
              id: crypto.randomUUID(),
              phaseId: phase.id,
              title: taskData.title,
              description: taskData.description,
              order: taskData.order,
              priority: taskData.priority as any, // Cast to Prisma enum
              estimatedDurationDays: taskData.estimatedDurationDays,
              source: 'AI_GENERATED',
              updatedAt: new Date(),
            },
          });
        }
      }

      // Note: Audit record is created by the orchestrator, not here

      return { workflowId: workflow.id };
    });

    return result;
  } catch (error) {
    console.error('Failed to persist workflow:', {
      requestId: ctx.requestId,
      submissionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown persistence error',
    };
  }
}
