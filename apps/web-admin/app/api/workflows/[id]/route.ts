import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@horizon/db';
import { guards, apiErrors } from '@/lib/security/guards';
import { runtime } from '@/lib/api-runtime';
import { UpdateWorkflowSchema, UpdateWorkflowInput } from '@/lib/workflow/validation';
import { calculateWorkflowDuration, computeWorkflowTimeline } from '@/lib/workflow/compute';

// GET /api/workflows/[id] - Fetch workflow with computed fields
export const GET = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    // Fetch workflow with all related data
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
      },
      include: {
        project: {
          select: { id: true, name: true, status: true },
        },
        phases: {
          include: {
            tasks: {
              include: {
                assignee: {
                  select: { id: true, firstName: true, lastName: true, email: true },
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
    const dependencies = await prisma.taskDependency.findMany({
      where: {
        OR: [{ fromTask: { phase: { workflowId } } }, { toTask: { phase: { workflowId } } }],
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
export const PATCH = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    const body = await request.json();
    const validatedData = UpdateWorkflowSchema.parse(body) as UpdateWorkflowInput;

    // Update workflow and track edit
    const workflow = await prisma.workflow.update({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
      },
      data: {
        ...validatedData,
        isManuallyEdited: true,
        lastEditedById: context.userId,
        lastEditedAt: new Date(),
      },
      include: {
        project: {
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
export const DELETE = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    // Check if workflow can be archived (no active phases/tasks)
    const activeTasksCount = await prisma.task.count({
      where: {
        phase: { workflowId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (activeTasksCount > 0) {
      return apiErrors.badRequest('Cannot archive workflow with active tasks');
    }

    // Archive workflow
    const workflow = await prisma.workflow.update({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
      },
      data: {
        status: 'ARCHIVED',
        isManuallyEdited: true,
        lastEditedById: context.userId,
        lastEditedAt: new Date(),
      },
      include: {
        project: {
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
