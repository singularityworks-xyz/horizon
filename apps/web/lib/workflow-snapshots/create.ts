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
    const workflow = await prisma.workflows.findFirst({
      where: { id: workflowId },
      include: {
        tenants: { select: { id: true } },
        projects: { select: { id: true } },
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
    const existingSnapshot = await prisma.workflow_snapshots.findFirst({
      where: {
        tenantId,
        projectId: projectId as string,
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
      await tx.workflow_snapshots.updateMany({
        where: {
          tenantId,
          projectId: projectId as string,
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

      const taskDependencies = await tx.task_dependencies.findMany({
        where: {
          OR: [{ fromTask: { phases: { workflowId } } }, { toTask: { phases: { workflowId } } }],
        },
        select: { fromTaskId: true, toTaskId: true },
      });

      // Compute timeline once
      const timeline = computeWorkflowTimeline(allTasks, taskDependencies, workflow.createdAt);

      // Create snapshot with computed data
      const snapshot = await tx.workflow_snapshots.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          projectId: projectId as string,
          workflowId,
          version: 1, // Increment logic could be added later
          isCurrent: true,
          dependencies: taskDependencies as any, // Store as JSON
          timeline: timeline as any, // Store computed timeline as JSON
          createdById,
        },
      });

      // Create snapshot phases and tasks
      for (const phase of workflow.phases) {
        const snapshotPhase = await tx.workflow_snapshot_phases.create({
          data: {
            id: crypto.randomUUID(),
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
          await tx.workflow_snapshot_tasks.create({
            data: {
              id: crypto.randomUUID(),
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

      await tx.workflow_snapshot_progress.create({
        data: {
          id: crypto.randomUUID(),
          snapshotId: snapshot.id,
          totalTasks,
          completedTasks: 0,
          perPhase: perPhase as any,
          updatedAt: new Date(),
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
  return prisma.workflow_snapshots.findFirst({
    where: {
      tenantId,
      projectId,
      isCurrent: true,
    },
    include: {
      phases: {
        include: {
          workflow_snapshot_tasks: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
      progress: true,
    },
  });
}
