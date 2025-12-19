import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@horizon/db';
import { guards, apiErrors } from '@/lib/security/guards';
import { runtime } from '@/lib/api-runtime';
import {
  CreateDependencySchema,
  CreateDependencyInput,
  validateTaskDependencies,
} from '@/lib/workflow/validation';

// GET /api/workflows/[workflowId]/dependencies - List dependencies for workflow
export const GET = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    // Verify workflow belongs to tenant
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
      },
      select: { id: true },
    });

    if (!workflow) {
      return apiErrors.forbidden('Workflow not found or access denied');
    }

    const dependencies = await prisma.taskDependency.findMany({
      where: {
        fromTask: { phase: { workflowId } },
        toTask: { phase: { workflowId } },
      },
      include: {
        fromTask: {
          select: { id: true, title: true, phase: { select: { id: true, name: true } } },
        },
        toTask: {
          select: { id: true, title: true, phase: { select: { id: true, name: true } } },
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
export const POST = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    const body = await request.json();
    const validatedData = CreateDependencySchema.parse(body) as CreateDependencyInput;

    // Verify both tasks belong to the workflow and tenant
    const [fromTask, toTask] = await Promise.all([
      prisma.task.findFirst({
        where: {
          id: validatedData.fromTaskId,
          phase: {
            workflowId,
            workflow: {
              tenantId: context.tenantId,
              status: { not: 'ARCHIVED' },
            },
          },
        },
        select: { id: true },
      }),
      prisma.task.findFirst({
        where: {
          id: validatedData.toTaskId,
          phase: {
            workflowId,
            workflow: {
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
    const existingDependency = await prisma.taskDependency.findUnique({
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
    const allDependencies = await prisma.taskDependency.findMany({
      where: {
        OR: [{ fromTask: { phase: { workflowId } } }, { toTask: { phase: { workflowId } } }],
      },
      select: { fromTaskId: true, toTaskId: true },
    });

    // Get all task IDs in the workflow
    const allTasks = await prisma.task.findMany({
      where: { phase: { workflowId } },
      select: { id: true },
    });
    const allTaskIds = new Set(allTasks.map((t) => t.id));

    // Add the new dependency to the list for validation
    const dependenciesWithNew = [
      ...allDependencies,
      { fromTaskId: validatedData.fromTaskId, toTaskId: validatedData.toTaskId },
    ];

    const validation = validateTaskDependencies(dependenciesWithNew, allTaskIds);

    if (!validation.isValid) {
      return apiErrors.badRequest(`Invalid dependency: ${validation.errors.join(', ')}`);
    }

    // Create dependency
    const dependency = await prisma.taskDependency.create({
      data: {
        fromTaskId: validatedData.fromTaskId,
        toTaskId: validatedData.toTaskId,
      },
      include: {
        fromTask: {
          select: { id: true, title: true, phase: { select: { id: true, name: true } } },
        },
        toTask: {
          select: { id: true, title: true, phase: { select: { id: true, name: true } } },
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
export const DELETE = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    const fromTaskId = searchParams.get('fromTaskId');
    const toTaskId = searchParams.get('toTaskId');

    if (!workflowId || !fromTaskId || !toTaskId) {
      return apiErrors.badRequest('Workflow ID, fromTaskId, and toTaskId are required');
    }

    // Delete dependency (the unique constraint ensures it's the right one)
    const dependency = await prisma.taskDependency.delete({
      where: {
        fromTaskId_toTaskId: {
          fromTaskId,
          toTaskId,
        },
        // Ensure both tasks belong to the workflow and tenant
        fromTask: {
          phase: {
            workflowId,
            workflow: {
              tenantId: context.tenantId,
            },
          },
        },
        toTask: {
          phase: {
            workflowId,
            workflow: {
              tenantId: context.tenantId,
            },
          },
        },
      },
      include: {
        fromTask: {
          select: { id: true, title: true, phase: { select: { id: true, name: true } } },
        },
        toTask: {
          select: { id: true, title: true, phase: { select: { id: true, name: true } } },
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
