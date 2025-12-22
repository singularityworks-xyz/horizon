import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import {
  type CreateQuestionInput,
  CreateQuestionSchema,
  type UpdateQuestionInput,
  UpdateQuestionSchema,
} from '@/lib/questionnaire/validation';
import { apiErrors, guards } from '@/lib/security/guards';

// GET /api/questionnaires/templates/[templateId]/questions - List questions for template
export const GET = guards.adminOnly(async (request, context, params) => {
  try {
    const templateId = params?.templateId || new URL(request.url).searchParams.get('templateId');

    // Verify template belongs to tenant
    const template = await prisma.questionnaire_templates.findFirst({
      where: {
        id: templateId,
        tenantId: context.tenantId,
      },
    });

    if (!template) {
      return apiErrors.forbidden('Template not found or access denied');
    }

    const questions = await prisma.questions.findMany({
      where: {
        templateId,
      },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { answers: true },
        },
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    return apiErrors.internalError('Failed to fetch questions');
  }
});

// POST /api/questionnaires/templates/[templateId]/questions - Create new question
export const POST = guards.adminOnly(async (request, context, params) => {
  try {
    const templateId = params?.templateId || new URL(request.url).searchParams.get('templateId');
    const body = await request.json();

    // Verify template belongs to tenant and is active
    const template = await prisma.questionnaire_templates.findFirst({
      where: {
        id: templateId,
        tenantId: context.tenantId,
        isActive: true,
      },
    });

    if (!template) {
      return apiErrors.forbidden('Template not found, inactive, or access denied');
    }

    // Validate input
    const validatedData = CreateQuestionSchema.parse(body) as CreateQuestionInput;

    // Check for duplicate order in this template
    const existingQuestion = await prisma.questions.findFirst({
      where: {
        templateId,
        order: validatedData.order,
      },
    });

    if (existingQuestion) {
      return apiErrors.badRequest('Question order must be unique within template');
    }

    // Create question
    const question = await prisma.questions.create({
      data: {
        id: crypto.randomUUID(),
        ...validatedData,
        templateId,
        config: validatedData.config ? JSON.parse(JSON.stringify(validatedData.config)) : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('Failed to create question:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid question data');
    }

    return apiErrors.internalError('Failed to create question');
  }
});

// PATCH /api/questionnaires/templates/[templateId]/questions/[questionId] - Update question
export const PATCH = guards.adminOnly(async (request, context, params) => {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');

  try {
    const templateId = params?.templateId || searchParams.get('templateId');

    if (!questionId) {
      return apiErrors.badRequest('Question ID is required');
    }

    const body = await request.json();
    const validatedData = UpdateQuestionSchema.parse(body) as UpdateQuestionInput;

    // Verify question belongs to template and tenant
    const existingQuestion = await prisma.questions.findFirst({
      where: {
        id: questionId,
        templateId,
        questionnaire_templates: {
          tenantId: context.tenantId,
          isActive: true,
        },
      },
    });

    if (!existingQuestion) {
      return apiErrors.forbidden('Question not found or access denied');
    }

    // Check for duplicate order if order is being changed
    if (validatedData.order !== undefined && validatedData.order !== existingQuestion.order) {
      const duplicateOrder = await prisma.questions.findFirst({
        where: {
          templateId,
          order: validatedData.order,
          id: { not: questionId },
        },
      });

      if (duplicateOrder) {
        return apiErrors.badRequest('Question order must be unique within template');
      }
    }

    // Update question
    const question = await prisma.questions.update({
      where: { id: questionId },
      data: {
        ...validatedData,
        config: validatedData.config ? JSON.parse(JSON.stringify(validatedData.config)) : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Failed to update question:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid question data');
    }

    return apiErrors.internalError('Failed to update question');
  }
});

// DELETE /api/questionnaires/templates/[templateId]/questions/[questionId] - Delete question
export const DELETE = guards.adminOnly(async (request, context, params) => {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');

  try {
    const templateId = params?.templateId || searchParams.get('templateId');

    if (!questionId) {
      return apiErrors.badRequest('Question ID is required');
    }

    // Verify question belongs to template and tenant, and check for answers
    const question = await prisma.questions.findFirst({
      where: {
        id: questionId,
        templateId,
        questionnaire_templates: {
          tenantId: context.tenantId,
          isActive: true,
        },
      },
      include: {
        _count: {
          select: { answers: true },
        },
      },
    });

    if (!question) {
      return apiErrors.forbidden('Question not found or access denied');
    }

    // Prevent deletion if question has been answered
    if (question._count.answers > 0) {
      return apiErrors.badRequest('Cannot delete question that has been answered');
    }

    // Delete question
    await prisma.questions.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete question:', error);
    return apiErrors.internalError('Failed to delete question');
  }
});
