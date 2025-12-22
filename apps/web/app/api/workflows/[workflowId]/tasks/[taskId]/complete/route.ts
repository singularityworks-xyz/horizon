import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import { apiErrors, guards } from '@/lib/security/guards';

// POST /api/workflows/[workflowId]/tasks/[taskId]/complete - Mark task as completed and update snapshot progress
export const POST = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');
    const taskId = params?.taskId || new URL(request.url).searchParams.get('taskId');

    if (!workflowId || !taskId) {
      return apiErrors.badRequest('Workflow ID and Task ID are required');
    }

    // Use transaction to atomically update task and snapshot progress
    const result = await prisma.$transaction(async (tx) => {
      // Validate task belongs to workflow and tenant, and get current status
      const task = await tx.tasks.findFirst({
        where: {
          id: taskId,
          phases: {
            workflowId,
            workflows: {
              tenantId: context.tenantId,
            },
          },
        },
        select: {
          id: true,
          status: true,
          completedAt: true,
          phases: {
            select: {
              order: true,
              workflows: {
                select: {
                  status: true,
                  tenantId: true,
                  projectId: true,
                },
              },
            },
          },
        },
      });

      if (!task) {
        throw new Error('Task not found or access denied');
      }

      if (task.status === 'COMPLETED') {
        throw new Error('Task is already completed');
      }

      if (task.status === 'CANCELLED') {
        throw new Error('Cannot complete a cancelled task');
      }

      // Update task to completed
      const updatedTask = await tx.tasks.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          isManuallyEdited: true,
          lastEditedById: context.userId,
          updatedAt: new Date(),
        },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { assets: true },
          },
        },
      });

      // If workflow is ACTIVE, update snapshot progress
      let snapshotProgressUpdated = false;
      if (task.phases.workflows.status === 'ACTIVE') {
        // Find current snapshot for this tenant+project
        const currentSnapshot = await tx.workflow_snapshots.findFirst({
          where: {
            tenantId: task.phases.workflows.tenantId,
            projectId: task.phases.workflows.projectId,
            isCurrent: true,
          },
          select: { id: true },
        });

        if (currentSnapshot) {
          // Find corresponding snapshot task
          const snapshotTask = await tx.workflow_snapshot_tasks.findFirst({
            where: {
              workflow_snapshot_phases: {
                snapshotId: currentSnapshot.id,
              },
              sourceTaskId: taskId,
            },
            select: { id: true },
          });

          if (snapshotTask) {
            // Get current progress
            const currentProgress = await tx.workflow_snapshot_progress.findUnique({
              where: { snapshotId: currentSnapshot.id },
              select: {
                totalTasks: true,
                completedTasks: true,
                perPhase: true,
              },
            });

            if (currentProgress) {
              // Update progress incrementally
              const newCompletedTasks = currentProgress.completedTasks + 1;
              const perPhase =
                (currentProgress.perPhase as Record<
                  string,
                  { total: number; completed: number; percentage: number }
                >) || {};

              // Update phase-specific progress
              const phaseKey = task.phases.order.toString();
              if (perPhase[phaseKey]) {
                perPhase[phaseKey].completed += 1;
                perPhase[phaseKey].percentage = Math.round(
                  (perPhase[phaseKey].completed / perPhase[phaseKey].total) * 100
                );
              }

              await tx.workflow_snapshot_progress.update({
                where: { snapshotId: currentSnapshot.id },
                data: {
                  completedTasks: newCompletedTasks,
                  perPhase,
                  updatedAt: new Date(),
                },
              });

              snapshotProgressUpdated = true;
            }
          }
        }
      }

      return {
        task: updatedTask,
        snapshotProgressUpdated,
      };
    });

    return NextResponse.json({
      task: result.task,
      snapshotProgressUpdated: result.snapshotProgressUpdated,
    });
  } catch (error) {
    console.error('Failed to complete task:', error);

    if (error instanceof Error) {
      if (error.message === 'Task not found or access denied') {
        return apiErrors.forbidden(error.message);
      }
      if (error.message.includes('already completed') || error.message.includes('cancelled')) {
        return apiErrors.badRequest(error.message);
      }
    }

    return apiErrors.internalError('Failed to complete task');
  }
});
