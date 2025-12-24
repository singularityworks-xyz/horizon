import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import {
  type CreateTemplateInput,
  CreateTemplateSchema,
  type UpdateTemplateInput,
  UpdateTemplateSchema,
} from '@/lib/questionnaire/validation';
import { apiErrors, guards } from '@/lib/security/guards';
import { auth } from '@/lib/auth';

// GET /api/questionnaires/templates - List templates for tenant
export const GET = guards.authenticated(async (request, context, params) => {
  // Extra safety: Check session role if context role is mismatched
  const session = await auth.api.getSession({
    headers: Object.fromEntries(request.headers.entries()),
  });

  const sessionRole = (session?.user as any)?.role?.toUpperCase();
  const contextRole = context.role?.toUpperCase();

  if (sessionRole !== 'ADMIN' && contextRole !== 'ADMIN') {
    return apiErrors.forbidden(
      `Admin access required. (Role: ${contextRole}, Session: ${sessionRole})`
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const templates = await prisma.questionnaire_templates.findMany({
      where: {
        tenantId: context.tenantId,
        ...(projectId && { projectId }),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        projects: {
          select: { id: true, name: true },
        },
        _count: {
          select: { questions: true, questionnaire_submissions: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { version: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return apiErrors.internalError('Failed to fetch questionnaire templates');
  }
});

// POST /api/questionnaires/templates - Create new template
export const POST = guards.authenticated(async (request, context, params) => {
  // Extra safety: Check session role if context role is mismatched
  const session = await auth.api.getSession({
    headers: Object.fromEntries(request.headers.entries()),
  });

  const sessionRole = (session?.user as any)?.role?.toUpperCase();
  const contextRole = context.role?.toUpperCase();

  if (sessionRole !== 'ADMIN' && contextRole !== 'ADMIN') {
    return apiErrors.forbidden(
      `Admin access required. (Role: ${contextRole}, Session: ${sessionRole})`
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const validatedData = CreateTemplateSchema.parse(body) as CreateTemplateInput;

    // Verify project belongs to tenant if specified
    if (validatedData.projectId) {
      const project = await prisma.projects.findFirst({
        where: {
          id: validatedData.projectId,
          tenantId: context.tenantId,
        },
      });

      if (!project) {
        return apiErrors.forbidden('Project not found or access denied');
      }
    }

    // Create template with version 1
    const template = await prisma.questionnaire_templates.create({
      data: {
        id: crypto.randomUUID(),
        ...validatedData,
        tenantId: context.tenantId,
        version: 1,
        updatedAt: new Date(),
      },
      include: {
        projects: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Failed to create template:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid template data');
    }

    return apiErrors.internalError('Failed to create questionnaire template');
  }
});

// PATCH /api/questionnaires/templates/[id] - Update template
export const PATCH = guards.authenticated(async (request, context, params) => {
  // Extra safety: Check session role if context role is mismatched
  const session = await auth.api.getSession({
    headers: Object.fromEntries(request.headers.entries()),
  });

  const sessionRole = (session?.user as any)?.role?.toUpperCase();
  const contextRole = context.role?.toUpperCase();

  if (sessionRole !== 'ADMIN' && contextRole !== 'ADMIN') {
    return apiErrors.forbidden(
      `Admin access required. (Role: ${contextRole}, Session: ${sessionRole})`
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return apiErrors.badRequest('Template ID is required');
    }

    const body = await request.json();
    const validatedData = UpdateTemplateSchema.parse(body) as UpdateTemplateInput;

    // Update template
    const template = await prisma.questionnaire_templates.update({
      where: {
        id: templateId,
        tenantId: context.tenantId,
      },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      include: {
        projects: {
          select: { id: true, name: true },
        },
        _count: {
          select: { questions: true, questionnaire_submissions: true },
        },
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Failed to update template:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid template data');
    }

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return apiErrors.forbidden('Template not found or access denied');
    }

    return apiErrors.internalError('Failed to update questionnaire template');
  }
});

// DELETE /api/questionnaires/templates/[id] - Delete template (soft delete by deactivating)
export const DELETE = guards.authenticated(async (request, context, params) => {
  // Extra safety: Check session role if context role is mismatched
  const session = await auth.api.getSession({
    headers: Object.fromEntries(request.headers.entries()),
  });

  const sessionRole = (session?.user as any)?.role?.toUpperCase();
  const contextRole = context.role?.toUpperCase();

  if (sessionRole !== 'ADMIN' && contextRole !== 'ADMIN') {
    return apiErrors.forbidden(
      `Admin access required. (Role: ${contextRole}, Session: ${sessionRole})`
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return apiErrors.badRequest('Template ID is required');
    }

    // Check if template has active submissions
    const submissionCount = await prisma.questionnaire_submissions.count({
      where: {
        templateId,
        tenantId: context.tenantId,
        status: { in: ['DRAFT', 'SUBMITTED'] },
      },
    });

    if (submissionCount > 0) {
      return apiErrors.badRequest('Cannot delete template with active submissions');
    }

    // Hard delete since there are no active submissions
    const template = await prisma.questionnaire_templates.delete({
      where: {
        id: templateId,
        tenantId: context.tenantId,
      },
      include: {
        projects: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Failed to delete template:', error);

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return apiErrors.forbidden('Template not found or access denied');
    }

    return apiErrors.internalError('Failed to delete questionnaire template');
  }
});
