import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@horizon/db';
import { guards, apiErrors } from '@/lib/security/guards';
import { runtime } from '@/lib/api-runtime';
import { CreatePhaseSchema, CreatePhaseInput } from '@/lib/workflow/validation';

// GET /api/workflows/[workflowId]/phases - List phases for workflow
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

    const phases = await prisma.phase.findMany({
      where: { workflowId },
      include: {
        _count: {
          select: { tasks: true, assets: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ phases });
  } catch (error) {
    console.error('Failed to fetch phases:', error);
    return apiErrors.internalError('Failed to fetch phases');
  }
});

// POST /api/workflows/[workflowId]/phases - Create new phase
export const POST = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    const body = await request.json();
    const validatedData = CreatePhaseSchema.parse(body) as CreatePhaseInput;

    // Verify workflow belongs to tenant and is not archived
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: context.tenantId,
        status: { not: 'ARCHIVED' },
      },
      select: { id: true },
    });

    if (!workflow) {
      return apiErrors.forbidden('Workflow not found, access denied, or archived');
    }

    // Check for duplicate order
    const existingPhase = await prisma.phase.findFirst({
      where: {
        workflowId,
        order: validatedData.order,
      },
    });

    if (existingPhase) {
      return apiErrors.badRequest(`Phase with order ${validatedData.order} already exists`);
    }

    // Create phase
    const phase = await prisma.phase.create({
      data: {
        workflowId,
        name: validatedData.name,
        intent: validatedData.intent,
        description: validatedData.description,
        order: validatedData.order,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        source: validatedData.source,
      },
      include: {
        _count: {
          select: { tasks: true, assets: true },
        },
      },
    });

    return NextResponse.json({ phase }, { status: 201 });
  } catch (error) {
    console.error('Failed to create phase:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid phase data');
    }

    return apiErrors.internalError('Failed to create phase');
  }
});
