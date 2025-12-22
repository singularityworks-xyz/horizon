import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import { apiErrors, guards } from '@/lib/security/guards';
import {
  type CreateTaskInput,
  CreateTaskSchema,
  type UpdateTaskInput,
  UpdateTaskSchema,
  validateTaskStatus,
} from '@/lib/workflow/validation';

// GET /api/workflows/[workflowId]/phases/[phaseId]/tasks - List tasks for phase
export const GET = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');
    const phaseId = params?.phaseId || new URL(request.url).searchParams.get('phaseId');

    if (!workflowId || !phaseId) {
      return apiErrors.badRequest('Workflow ID and Phase ID are required');
    }

    // Verify workflow and phase belong to tenant
    const phase = await prisma.phases.findFirst({
      where: {
        id: phaseId,
        workflowId,
        workflows: {
          tenantId: context.tenantId,
        },
      },
      select: { id: true },
    });

    if (!phase) {
      return apiErrors.forbidden('Phase not found or access denied');
    }

    const tasks = await prisma.tasks.findMany({
      where: { phaseId },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return apiErrors.internalError('Failed to fetch tasks');
  }
});

// POST /api/workflows/[workflowId]/phases/[phaseId]/tasks - Create new task
export const POST = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');
    const phaseId = params?.phaseId || new URL(request.url).searchParams.get('phaseId');

    if (!workflowId || !phaseId) {
      return apiErrors.badRequest('Workflow ID and Phase ID are required');
    }

    const body = await request.json();
    const validatedData = CreateTaskSchema.parse(body) as CreateTaskInput;

    // Verify phase belongs to tenant and workflow is not archived
    const phase = await prisma.phases.findFirst({
      where: {
        id: phaseId,
        workflowId,
        workflows: {
          tenantId: context.tenantId,
          status: { not: 'ARCHIVED' },
        },
      },
      select: { id: true },
    });

    if (!phase) {
      return apiErrors.forbidden('Phase not found, access denied, or workflow archived');
    }

    // Check for duplicate order in this phase
    const existingTask = await prisma.tasks.findFirst({
      where: {
        phaseId,
        order: validatedData.order,
      },
    });

    if (existingTask) {
      return apiErrors.badRequest(
        `Task with order ${validatedData.order} already exists in this phase`
      );
    }

    // Verify assignee belongs to tenant if specified
    if (validatedData.assigneeId) {
      const assignee = await prisma.users.findFirst({
        where: {
          id: validatedData.assigneeId,
          tenantId: context.tenantId,
        },
      });

      if (!assignee) {
        return apiErrors.badRequest('Assignee not found or access denied');
      }
    }

    // Create task
    const task = await prisma.tasks.create({
      data: {
        id: crypto.randomUUID(),
        phaseId,
        title: validatedData.title,
        description: validatedData.description,
        order: validatedData.order,
        priority: validatedData.priority,
        assigneeId: validatedData.assigneeId,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        estimatedDurationDays: validatedData.estimatedDurationDays,
        isMilestone: validatedData.isMilestone,
        source: validatedData.source,
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

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid task data');
    }

    return apiErrors.internalError('Failed to create task');
  }
});

// PATCH /api/workflows/[workflowId]/phases/[phaseId]/tasks - Update task
export const PATCH = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');
    const phaseId = params?.phaseId || new URL(request.url).searchParams.get('phaseId');
    const taskId = params?.taskId || new URL(request.url).searchParams.get('taskId');

    if (!workflowId || !phaseId || !taskId) {
      return apiErrors.badRequest('Workflow ID, Phase ID, and Task ID are required');
    }

    const body = await request.json();
    const validatedData = UpdateTaskSchema.parse(body) as UpdateTaskInput;

    // Verify task belongs to tenant
    const task = await prisma.tasks.findFirst({
      where: {
        id: taskId,
        phaseId,
        phases: {
          workflowId,
          workflows: {
            tenantId: context.tenantId,
            status: { not: 'ARCHIVED' },
          },
        },
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
      },
    });

    if (!task) {
      return apiErrors.forbidden('Task not found or access denied');
    }

    // Validate status transitions if status is being updated
    if (validatedData.status) {
      const statusValidation = validateTaskStatus(validatedData.status, task.completedAt);

      if (!statusValidation.isValid) {
        return apiErrors.badRequest(
          `Invalid status transition: ${statusValidation.errors.join(', ')}`
        );
      }

      // Set completedAt for COMPLETED status
      if (validatedData.status === 'COMPLETED' && !task.completedAt) {
        validatedData.completedAt = new Date().toISOString();
      }
    }

    // Check for duplicate order if order is being updated
    if (validatedData.order !== undefined) {
      const existingTask = await prisma.tasks.findFirst({
        where: {
          phaseId,
          order: validatedData.order,
          id: { not: taskId }, // Exclude current task
        },
      });

      if (existingTask) {
        return apiErrors.badRequest(
          `Task with order ${validatedData.order} already exists in this phase`
        );
      }
    }

    // Verify assignee belongs to tenant if being updated
    if (validatedData.assigneeId) {
      const assignee = await prisma.users.findFirst({
        where: {
          id: validatedData.assigneeId,
          tenantId: context.tenantId,
        },
      });

      if (!assignee) {
        return apiErrors.badRequest('Assignee not found or access denied');
      }
    }

    // Update task and track edit
    const updatedTask = await prisma.tasks.update({
      where: { id: taskId },
      data: {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
        completedAt: validatedData.completedAt ? new Date(validatedData.completedAt) : undefined,
        isManuallyEdited: true,
        lastEditedById: context.userId,
        lastEditedAt: new Date(),
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

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Failed to update task:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid task data');
    }

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return apiErrors.forbidden('Task not found or access denied');
    }

    return apiErrors.internalError('Failed to update task');
  }
});

// DELETE /api/workflows/[workflowId]/phases/[phaseId]/tasks - Delete task
export const DELETE = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');
    const phaseId = params?.phaseId || new URL(request.url).searchParams.get('phaseId');
    const taskId = params?.taskId || new URL(request.url).searchParams.get('taskId');

    if (!workflowId || !phaseId || !taskId) {
      return apiErrors.badRequest('Workflow ID, Phase ID, and Task ID are required');
    }

    // Check if task can be safely deleted (no dependencies or assets)
    // TODO(v2): Allow delete with explicit cascade preview - show user what will be affected
    // and allow them to choose cascade options for dependencies/assets
    const [dependencyCount, assetCount] = await Promise.all([
      prisma.task_dependencies.count({
        where: {
          OR: [{ fromTaskId: taskId }, { toTaskId: taskId }],
        },
      }),
      prisma.assets.count({
        where: { taskId },
      }),
    ]);

    if (dependencyCount > 0) {
      return apiErrors.badRequest('Cannot delete task with existing dependencies');
    }

    if (assetCount > 0) {
      return apiErrors.badRequest('Cannot delete task with attached assets');
    }

    // Delete task
    const task = await prisma.tasks.delete({
      where: {
        id: taskId,
        phaseId,
        phases: {
          workflowId,
          workflows: {
            tenantId: context.tenantId,
            status: { not: 'ARCHIVED' },
          },
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to delete task:', error);

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return apiErrors.forbidden('Task not found or access denied');
    }

    return apiErrors.internalError('Failed to delete task');
  }
});
