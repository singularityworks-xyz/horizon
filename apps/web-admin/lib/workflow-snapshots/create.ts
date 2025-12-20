// Workflow Snapshot Creation Service
// Creates immutable snapshots of workflows for client-visible state

import { prisma } from '@horizon/db';
import { computeWorkflowTimeline } from '../workflow/compute';

export interface CreateSnapshotResult {
  snapshotId?: string;
  existed?: boolean; // true if snapshot already existed and was returned
  error?: string;
}

/**
 * Creates or returns an existing current snapshot for a workflow.
 * Idempotent: if a current snapshot exists for (tenantId, projectId), returns it.
 * Otherwise creates a new snapshot with computed timeline and progress.
 */
export async function createWorkflowSnapshot(
  workflowId: string,
  createdById: string
): Promise<CreateSnapshotResult> {
  try {
    // Load workflow with all phases, tasks, and dependencies (scoped by tenant)
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId },
      include: {
        tenant: { select: { id: true } },
        project: { select: { id: true } },
        phases: {
          include: {
            tasks: {
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                priority: true,
                estimatedDurationDays: true,
                isMilestone: true,
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      return { error: 'Workflow not found' };
    }

    const { tenantId, projectId, status } = workflow;

    // Check if a current snapshot already exists
    const existingSnapshot = await prisma.workflowSnapshot.findFirst({
      where: {
        tenantId,
        projectId,
        isCurrent: true,
      },
      select: { id: true },
    });

    // If workflow is ACTIVE and snapshot exists, return existing (idempotent)
    if (status === 'ACTIVE' && existingSnapshot) {
      return {
        snapshotId: existingSnapshot.id,
        existed: true,
      };
    }

    // If workflow is not ACTIVE, don't create snapshot
    if (status !== 'ACTIVE') {
      return { error: 'Workflow must be ACTIVE to create snapshot' };
    }

    // Create new snapshot - use transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      // Mark any existing current snapshot as not current
      await tx.workflowSnapshot.updateMany({
        where: {
          tenantId,
          projectId,
          isCurrent: true,
        },
        data: { isCurrent: false },
      });

      // Collect all tasks and dependencies for timeline computation
      const allTasks = workflow.phases.flatMap((phase) =>
        phase.tasks.map((task) => ({
          id: task.id,
          estimatedDurationDays: task.estimatedDurationDays,
        }))
      );

      const taskDependencies = await tx.taskDependency.findMany({
        where: {
          OR: [{ fromTask: { phase: { workflowId } } }, { toTask: { phase: { workflowId } } }],
        },
        select: { fromTaskId: true, toTaskId: true },
      });

      // Compute timeline once
      const timeline = computeWorkflowTimeline(allTasks, taskDependencies, workflow.createdAt);

      // Create snapshot with computed data
      const snapshot = await tx.workflowSnapshot.create({
        data: {
          tenantId,
          projectId,
          workflowId,
          version: 1, // Increment logic could be added later
          isCurrent: true,
          dependencies: taskDependencies, // Store as JSON
          timeline, // Store computed timeline as JSON
          createdById,
        },
      });

      // Create snapshot phases and tasks
      for (const phase of workflow.phases) {
        const snapshotPhase = await tx.workflowSnapshotPhase.create({
          data: {
            snapshotId: snapshot.id,
            sourcePhaseId: phase.id,
            name: phase.name,
            intent: phase.intent,
            description: phase.description,
            order: phase.order,
          },
        });

        // Create snapshot tasks
        for (const task of phase.tasks) {
          await tx.workflowSnapshotTask.create({
            data: {
              snapshotPhaseId: snapshotPhase.id,
              sourceTaskId: task.id,
              title: task.title,
              description: task.description,
              order: task.order,
              priority: task.priority,
              estimatedDurationDays: task.estimatedDurationDays,
              isMilestone: task.isMilestone,
            },
          });
        }
      }

      // Initialize progress (all tasks start as not completed)
      const totalTasks = allTasks.length;
      const perPhase: Record<string, { total: number; completed: number; percentage: number }> = {};

      for (const phase of workflow.phases) {
        const phaseTasks = phase.tasks;
        perPhase[phase.order] = {
          total: phaseTasks.length,
          completed: 0,
          percentage: 0,
        };
      }

      await tx.workflowSnapshotProgress.create({
        data: {
          snapshotId: snapshot.id,
          totalTasks,
          completedTasks: 0,
          perPhase,
        },
      });

      return snapshot;
    });

    return { snapshotId: result.id };
  } catch (error) {
    console.error('Failed to create workflow snapshot:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error creating snapshot',
    };
  }
}

/**
 * Gets the current snapshot for a tenant+project combination.
 * Returns null if no current snapshot exists.
 */
export async function getCurrentSnapshot(tenantId: string, projectId: string) {
  return prisma.workflowSnapshot.findFirst({
    where: {
      tenantId,
      projectId,
      isCurrent: true,
    },
    include: {
      phases: {
        include: {
          tasks: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
      progress: true,
    },
  });
}
