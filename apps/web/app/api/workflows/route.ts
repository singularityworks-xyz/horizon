import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import { apiErrors, guards } from '@/lib/security/guards';
import { calculateWorkflowDuration } from '@/lib/workflow/compute';
import {
  type CreateWorkflowInput,
  CreateWorkflowSchema,
  validateWorkflowStructure,
} from '@/lib/workflow/validation';

// GET /api/workflows - List workflows for tenant
export const GET = guards.adminOnly(async (request, context, params) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') as any;
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const where: any = {
      tenantId: context.tenantId,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (!includeArchived) {
      where.status = { not: 'ARCHIVED' };
    }

    const workflows = await prisma.workflows.findMany({
      where,
      include: {
        projects: {
          select: { id: true, name: true },
        },
        users_workflows_aiApprovedByIdTousers: {
          select: { id: true, firstName: true, lastName: true },
        },
        ai_workflow_generations: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Most recent generation attempt
        },
        _count: {
          select: { phases: true },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE first, then DRAFT, etc.
        { updatedAt: 'desc' },
      ],
    });

    // Add computed duration for each workflow
    const workflowsWithDuration = await Promise.all(
      workflows.map(async (workflow) => {
        // Get tasks and dependencies for duration calculation
        const [tasks, dependencies] = await Promise.all([
          prisma.tasks.findMany({
            where: { phases: { workflowId: workflow.id } },
            select: { id: true, estimatedDurationDays: true },
          }),
          prisma.task_dependencies.findMany({
            where: {
              tasks_task_dependencies_fromTaskIdTotasks: { phases: { workflowId: workflow.id } },
              tasks_task_dependencies_toTaskIdTotasks: { phases: { workflowId: workflow.id } },
            },
            select: { fromTaskId: true, toTaskId: true },
          }),
        ]);

        const duration = calculateWorkflowDuration(tasks, dependencies);

        return {
          ...workflow,
          computedDurationDays: duration,
        };
      })
    );

    return NextResponse.json({ workflows: workflowsWithDuration });
  } catch (error) {
    console.error('Failed to fetch workflows:', error);
    return apiErrors.internalError('Failed to fetch workflows');
  }
});

// POST /api/workflows - Create new workflow
export const POST = guards.adminOnly(async (request, context, params) => {
  try {
    const body = await request.json();
    const validatedData = CreateWorkflowSchema.parse(body) as CreateWorkflowInput;

    // Verify project belongs to tenant and is not completed/archived
    const project = await prisma.projects.findFirst({
      where: {
        id: validatedData.projectId,
        tenantId: context.tenantId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    if (!project) {
      return apiErrors.forbidden('Project not found, access denied, or not in active state');
    }

    // Check if workflow already exists for this project
    const existingWorkflow = await prisma.workflows.findFirst({
      where: {
        tenantId: context.tenantId,
        projectId: validatedData.projectId,
        status: { not: 'ARCHIVED' },
      },
    });

    if (existingWorkflow) {
      return apiErrors.badRequest('Workflow already exists for this project');
    }

    // Create workflow in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create workflow
      const workflow = await tx.workflows.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: context.tenantId,
          projectId: validatedData.projectId,
          name: validatedData.name,
          description: validatedData.description,
          source: validatedData.source,
          status: validatedData.status,
          updatedAt: new Date(),
        },
        include: {
          projects: {
            select: { id: true, name: true },
          },
        },
      });

      // Create phases and tasks if provided
      if (validatedData.phases && validatedData.phases.length > 0) {
        for (const phaseData of validatedData.phases) {
          const phase = await tx.phases.create({
            data: {
              id: crypto.randomUUID(),
              workflowId: workflow.id,
              name: phaseData.name,
              intent: phaseData.intent,
              description: phaseData.description,
              order: phaseData.order,
              startDate: phaseData.startDate ? new Date(phaseData.startDate) : null,
              endDate: phaseData.endDate ? new Date(phaseData.endDate) : null,
              source: phaseData.source,
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
                priority: taskData.priority,
                assigneeId: taskData.assigneeId,
                dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
                estimatedDurationDays: taskData.estimatedDurationDays,
                isMilestone: taskData.isMilestone,
                source: taskData.source,
                updatedAt: new Date(),
              },
            });
          }
        }

        // Validate the created workflow structure
        const createdPhases = await tx.phases.findMany({
          where: { workflowId: workflow.id },
          include: {
            tasks: {
              select: { id: true, order: true },
            },
          },
        });

        const validation = validateWorkflowStructure(
          createdPhases.map((p) => ({
            id: p.id,
            order: p.order,
            tasks: p.tasks,
          })),
          validatedData.status
        );

        if (!validation.isValid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
        }
      }

      return workflow;
    });

    return NextResponse.json({ workflow: result }, { status: 201 });
  } catch (error) {
    console.error('Failed to create workflow:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid workflow data');
    }

    if (error instanceof Error && error.message.includes('Workflow validation failed')) {
      return apiErrors.badRequest(error.message);
    }

    return apiErrors.internalError('Failed to create workflow');
  }
});
