import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import { apiErrors, guards } from '@/lib/security/guards';
import {
  type CreateDependencyInput,
  CreateDependencySchema,
  validateTaskDependencies,
} from '@/lib/workflow/validation';

// GET /api/workflows/[workflowId]/dependencies - List dependencies for workflow
export const GET = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    // Verify workflow belongs to tenant
    const workflow = await prisma.workflows.findFirst({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
      },
      select: { id: true },
    });

    if (!workflow) {
      return apiErrors.forbidden('Workflow not found or access denied');
    }

    const dependencies = await prisma.task_dependencies.findMany({
      where: {
        tasks_task_dependencies_fromTaskIdTotasks: { phases: { workflowId } },
        tasks_task_dependencies_toTaskIdTotasks: { phases: { workflowId } },
      },
      include: {
        tasks_task_dependencies_fromTaskIdTotasks: {
          select: {
            id: true,
            title: true,
            phases: { select: { id: true, name: true } },
          },
        },
        tasks_task_dependencies_toTaskIdTotasks: {
          select: {
            id: true,
            title: true,
            phases: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ dependencies });
  } catch (error) {
    console.error('Failed to fetch dependencies:', error);
    return apiErrors.internalError('Failed to fetch dependencies');
  }
});

// POST /api/workflows/[workflowId]/dependencies - Create dependency
export const POST = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    const body = await request.json();
    const validatedData = CreateDependencySchema.parse(body) as CreateDependencyInput;

    // Verify both tasks belong to the workflow and tenant
    const [fromTask, toTask] = await Promise.all([
      prisma.tasks.findFirst({
        where: {
          id: validatedData.fromTaskId,
          phases: {
            workflowId,
            workflows: {
              tenantId: context.tenantId,
              status: { not: 'ARCHIVED' },
            },
          },
        },
        select: { id: true },
      }),
      prisma.tasks.findFirst({
        where: {
          id: validatedData.toTaskId,
          phases: {
            workflowId,
            workflows: {
              tenantId: context.tenantId,
              status: { not: 'ARCHIVED' },
            },
          },
        },
        select: { id: true },
      }),
    ]);

    if (!fromTask || !toTask) {
      return apiErrors.forbidden('One or both tasks not found or access denied');
    }

    // Check if dependency already exists
    const existingDependency = await prisma.task_dependencies.findUnique({
      where: {
        fromTaskId_toTaskId: {
          fromTaskId: validatedData.fromTaskId,
          toTaskId: validatedData.toTaskId,
        },
      },
    });

    if (existingDependency) {
      return apiErrors.badRequest('Dependency already exists');
    }

    // Validate that adding this dependency doesn't create a cycle
    // Get all existing dependencies in the workflow
    const allDependencies = await prisma.task_dependencies.findMany({
      where: {
        OR: [
          { tasks_task_dependencies_fromTaskIdTotasks: { phases: { workflowId } } },
          { tasks_task_dependencies_toTaskIdTotasks: { phases: { workflowId } } },
        ],
      },
      select: { id: true, fromTaskId: true, toTaskId: true },
    });

    // Get all task IDs in the workflow
    const allTasks = await prisma.tasks.findMany({
      where: { phases: { workflowId } },
      select: { id: true },
    });
    const allTaskIds = new Set(allTasks.map((t) => t.id));

    // Add the new dependency to the list for validation
    const dependenciesWithNew = [
      ...allDependencies,
      {
        id: 'new',
        fromTaskId: validatedData.fromTaskId,
        toTaskId: validatedData.toTaskId,
      },
    ];

    const validation = validateTaskDependencies(dependenciesWithNew, allTaskIds);

    if (!validation.isValid) {
      return apiErrors.badRequest(`Invalid dependency: ${validation.errors.join(', ')}`);
    }

    // Create dependency
    const dependency = await prisma.task_dependencies.create({
      data: {
        id: crypto.randomUUID(),
        fromTaskId: validatedData.fromTaskId,
        toTaskId: validatedData.toTaskId,
      },
      include: {
        tasks_task_dependencies_fromTaskIdTotasks: {
          select: {
            id: true,
            title: true,
            phases: { select: { id: true, name: true } },
          },
        },
        tasks_task_dependencies_toTaskIdTotasks: {
          select: {
            id: true,
            title: true,
            phases: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    console.error('Failed to create dependency:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid dependency data');
    }

    return apiErrors.internalError('Failed to create dependency');
  }
});

// DELETE /api/workflows/[workflowId]/dependencies - Remove dependency
export const DELETE = guards.adminOnly(async (request, context, params) => {
  try {
    const workflowId = params?.workflowId || new URL(request.url).searchParams.get('workflowId');
    const fromTaskId = params?.fromTaskId || new URL(request.url).searchParams.get('fromTaskId');
    const toTaskId = params?.toTaskId || new URL(request.url).searchParams.get('toTaskId');

    if (!workflowId || !fromTaskId || !toTaskId) {
      return apiErrors.badRequest('Workflow ID, fromTaskId, and toTaskId are required');
    }

    // Delete dependency (the unique constraint ensures it's the right one)
    const dependency = await prisma.task_dependencies.delete({
      where: {
        fromTaskId_toTaskId: {
          fromTaskId: fromTaskId!,
          toTaskId: toTaskId!,
        },
        // Ensure both tasks belong to the workflow and tenant
        tasks_task_dependencies_fromTaskIdTotasks: {
          phases: {
            workflowId: workflowId!,
            workflows: {
              tenantId: context.tenantId,
            },
          },
        },
        tasks_task_dependencies_toTaskIdTotasks: {
          phases: {
            workflowId: workflowId!,
            workflows: {
              tenantId: context.tenantId,
            },
          },
        },
      },
      include: {
        tasks_task_dependencies_fromTaskIdTotasks: {
          select: {
            id: true,
            title: true,
            phases: { select: { id: true, name: true } },
          },
        },
        tasks_task_dependencies_toTaskIdTotasks: {
          select: {
            id: true,
            title: true,
            phases: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ dependency });
  } catch (error) {
    console.error('Failed to delete dependency:', error);

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return apiErrors.forbidden('Dependency not found or access denied');
    }

    return apiErrors.internalError('Failed to delete dependency');
  }
});
