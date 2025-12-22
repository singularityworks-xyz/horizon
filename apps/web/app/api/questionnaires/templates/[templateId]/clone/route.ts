import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import { apiErrors, guards } from '@/lib/security/guards';

// POST /api/questionnaires/templates/[templateId]/clone - Clone template to new version
export const POST = guards.adminOnly(async (request, context, params) => {
  try {
    const templateId = params?.templateId || new URL(request.url).searchParams.get('templateId');

    if (!templateId) {
      return apiErrors.badRequest('Template ID is required');
    }

    // Get the original template with questions
    const originalTemplate = await prisma.questionnaire_templates.findFirst({
      where: {
        id: templateId,
        tenantId: context.tenantId,
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!originalTemplate) {
      return apiErrors.forbidden('Template not found or access denied');
    }

    // Create transaction to clone template and questions
    const result = await prisma.$transaction(async (tx) => {
      // Create new template version
      const newTemplate = await tx.questionnaire_templates.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: context.tenantId,
          projectId: originalTemplate.projectId,
          name: originalTemplate.name,
          description: originalTemplate.description,
          version: originalTemplate.version + 1,
          isActive: false, // Start as inactive
          updatedAt: new Date(),
        },
      });

      // Clone all questions
      if (originalTemplate.questions.length > 0) {
        await tx.questions.createMany({
          data: originalTemplate.questions.map((question) => ({
            id: crypto.randomUUID(),
            templateId: newTemplate.id,
            type: question.type,
            title: question.title,
            description: question.description,
            config: question.config as any, // JSON type compatibility
            order: question.order,
            required: question.required,
            updatedAt: new Date(),
          })),
        });
      }

      // Return the new template with questions
      return await tx.questionnaire_templates.findUnique({
        where: { id: newTemplate.id },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
          projects: {
            select: { id: true, name: true },
          },
        },
      });
    });

    return NextResponse.json({ questionnaire_templates: result }, { status: 201 });
  } catch (error) {
    console.error('Failed to clone template:', error);
    return apiErrors.internalError('Failed to clone questionnaire template');
  }
});
