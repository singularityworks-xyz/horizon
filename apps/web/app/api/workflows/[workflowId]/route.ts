import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import { apiErrors, guards } from '@/lib/security/guards';
import { calculateWorkflowDuration, computeWorkflowTimeline } from '@/lib/workflow/compute';
import { type UpdateWorkflowInput, UpdateWorkflowSchema } from '@/lib/workflow/validation';
import { createWorkflowSnapshot } from '@/lib/workflow-snapshots/create';

// GET /api/workflows/[workflowId] - Fetch workflow with computed fields
export const GET = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    // Fetch workflow with all related data
    const workflow = await prisma.workflows.findFirst({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
      },
      include: {
        projects: {
          select: { id: true, name: true, status: true },
        },
        phases: {
          include: {
            tasks: {
              include: {
                users_tasks_assigneeIdTousers: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                _count: {
                  select: { assets: true },
                },
              },
              orderBy: { order: 'asc' },
            },
            _count: {
              select: { assets: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { assets: true },
        },
      },
    });

    if (!workflow) {
      return apiErrors.forbidden('Workflow not found or access denied');
    }

    // Get dependencies for computation
    const dependencies = await prisma.task_dependencies.findMany({
      where: {
        OR: [
          { tasks_task_dependencies_fromTaskIdTotasks: { phases: { workflowId } } },
          { tasks_task_dependencies_toTaskIdTotasks: { phases: { workflowId } } },
        ],
      },
      select: { fromTaskId: true, toTaskId: true },
    });

    // Compute timeline information
    const allTasks = workflow.phases.flatMap((phase) =>
      phase.tasks.map((task) => ({
        id: task.id,
        estimatedDurationDays: task.estimatedDurationDays,
        dueDate: task.dueDate,
      }))
    );

    const timeline = computeWorkflowTimeline(allTasks, dependencies, workflow.createdAt);

    // Add computed fields to response
    const workflowWithComputed = {
      ...workflow,
      computedDurationDays: timeline.totalDuration,
      criticalPathDuration: timeline.criticalPathDuration,
      criticalPathTaskIds: timeline.criticalPath,
      taskTimelines: timeline.taskTimelines,
    };

    return NextResponse.json({ workflow: workflowWithComputed });
  } catch (error) {
    console.error('Failed to fetch workflow:', error);
    return apiErrors.internalError('Failed to fetch workflow');
  }
});

// PATCH /api/workflows/[id] - Update workflow
export const PATCH = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId =
      params?.workflowId || params?.id || new URL(request.url).searchParams.get('id');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    const body = await request.json();
    const validatedData = UpdateWorkflowSchema.parse(body) as UpdateWorkflowInput;

    // If status is being changed to ACTIVE, validate eligibility first
    if (validatedData.status === 'ACTIVE') {
      const currentWorkflow = await prisma.workflows.findFirst({
        where: {
          id: workflowId,
          tenantId: context.tenantId,
        },
        select: {
          status: true,
          aiApprovedAt: true,
          source: true,
        },
      });

      if (!currentWorkflow) {
        return apiErrors.forbidden('Workflow not found or access denied');
      }

      // AI workflows must be approved before becoming ACTIVE
      if (currentWorkflow.source === 'AI_GENERATED' && !currentWorkflow.aiApprovedAt) {
        return apiErrors.badRequest('AI workflows must be approved before becoming active');
      }

      // Use transaction to atomically update status and create snapshot
      const result = await prisma.$transaction(async (tx) => {
        // Update workflow status
        const updatedWorkflow = await tx.workflows.update({
          where: { id: workflowId },
          data: {
            ...validatedData,
            isManuallyEdited: true,
            lastEditedById: context.userId,
            lastEditedAt: new Date(),
          },
          include: {
            projects: { select: { id: true, name: true } },
            _count: { select: { phases: true } },
          },
        });

        // Create snapshot for client visibility
        const snapshotResult = await createWorkflowSnapshot(workflowId!, context.userId);

        if (snapshotResult.error) {
          throw new Error(`Failed to create snapshot: ${snapshotResult.error}`);
        }

        return {
          workflow: updatedWorkflow,
          snapshotId: snapshotResult.snapshotId,
          existed: snapshotResult.existed,
        };
      });

      return NextResponse.json({
        workflow: result.workflow,
        snapshotId: result.snapshotId,
        existed: result.existed,
      });
    }

    // Regular update (not status change to ACTIVE)
    const workflow = await prisma.workflows.update({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
      },
      data: {
        ...validatedData,
        isManuallyEdited: true,
        lastEditedById: context.userId,
        lastEditedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        projects: {
          select: { id: true, name: true },
        },
        _count: {
          select: { phases: true },
        },
      },
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Failed to update workflow:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid workflow data');
    }

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return apiErrors.forbidden('Workflow not found or access denied');
    }

    return apiErrors.internalError('Failed to update workflow');
  }
});

// DELETE /api/workflows/[id] - Archive workflow (soft delete)
export const DELETE = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    // Check if workflow can be archived (no active phases/tasks)
    const activeTasksCount = await prisma.tasks.count({
      where: {
        phases: { workflowId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (activeTasksCount > 0) {
      return apiErrors.badRequest('Cannot archive workflow with active tasks');
    }

    // Archive workflow
    const workflow = await prisma.workflows.update({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
      },
      data: {
        status: 'ARCHIVED',
        isManuallyEdited: true,
        lastEditedById: context.userId,
        lastEditedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        projects: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Failed to archive workflow:', error);

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return apiErrors.forbidden('Workflow not found or access denied');
    }

    return apiErrors.internalError('Failed to archive workflow');
  }
});

// POST /api/workflows/[workflowId]/publish - Publish workflow (make ACTIVE + create snapshot)
export const POST = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    // Get workflow status to check if it's eligible for publishing
    const workflow = await prisma.workflows.findFirst({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
      },
      select: {
        status: true,
        aiApprovedAt: true,
        source: true,
      },
    });

    if (!workflow) {
      return apiErrors.forbidden('Workflow not found or access denied');
    }

    // Validate publishing eligibility
    if (workflow.status === 'ARCHIVED') {
      return apiErrors.badRequest('Cannot publish archived workflow');
    }

    if (workflow.status === 'COMPLETED') {
      return apiErrors.badRequest('Cannot publish completed workflow');
    }

    // AI workflows must be approved before publishing
    if (workflow.source === 'AI_GENERATED' && !workflow.aiApprovedAt) {
      return apiErrors.badRequest('AI workflows must be approved before publishing');
    }

    // Use transaction to atomically update status and create snapshot
    const result = await prisma.$transaction(async (tx) => {
      // Update workflow status to ACTIVE
      const updatedWorkflow = await tx.workflows.update({
        where: { id: workflowId },
        data: {
          status: 'ACTIVE',
          isManuallyEdited: true,
          lastEditedById: context.userId,
          lastEditedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          projects: { select: { id: true, name: true } },
        },
      });

      // Create snapshot for client visibility
      const snapshotResult = await createWorkflowSnapshot(workflowId!, context.userId);

      if (snapshotResult.error) {
        throw new Error(`Failed to create snapshot: ${snapshotResult.error}`);
      }

      return {
        workflow: updatedWorkflow,
        snapshotId: snapshotResult.snapshotId,
        existed: snapshotResult.existed,
      };
    });

    return NextResponse.json({
      workflow: result.workflow,
      snapshotId: result.snapshotId,
      existed: result.existed,
    });
  } catch (error) {
    console.error('Failed to publish workflow:', error);

    if (error instanceof Error && error.message.includes('Failed to create snapshot')) {
      return apiErrors.badRequest(error.message);
    }

    return apiErrors.internalError('Failed to publish workflow');
  }
});
