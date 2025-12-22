import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { runtime } from '@/lib/api-runtime';
import {
  type AnswerValue,
  type CreateSubmissionInput,
  CreateSubmissionSchema,
  evaluateConditions,
  type SubmitAnswerInput,
  SubmitAnswerSchema,
  validateAnswerAgainstConfig,
} from '@/lib/questionnaire/validation';
import { apiErrors, guards } from '@/lib/security/guards';

// GET /api/questionnaires/submissions - List submissions for tenant
export const GET = guards.authenticated(async (request, context, params) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const templateId = searchParams.get('templateId');
    const status = searchParams.get('status') as any;

    const submissions = await prisma.questionnaire_submissions.findMany({
      where: {
        tenantId: context.tenantId,
        ...(projectId && { projectId }),
        ...(templateId && { templateId }),
        ...(status && { status }),
      },
      include: {
        template: {
          select: { id: true, name: true, version: true, isActive: true },
        },
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { answers: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    return apiErrors.internalError('Failed to fetch questionnaire submissions');
  }
});

// POST /api/questionnaires/submissions - Create new submission draft
export const POST = guards.authenticated(async (request, context, params) => {
  try {
    const body = await request.json();
    const validatedData = CreateSubmissionSchema.parse(body) as CreateSubmissionInput;

    // Verify template belongs to tenant and is active
    const template = await prisma.questionnaire_templates.findFirst({
      where: {
        id: validatedData.templateId,
        tenantId: context.tenantId,
        isActive: true,
      },
    });

    if (!template) {
      return apiErrors.forbidden('Template not found, inactive, or access denied');
    }

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

    // Check if submission already exists for this project-template combination
    const existingSubmission = await prisma.questionnaire_submissions.findFirst({
      where: {
        tenantId: context.tenantId,
        projectId: validatedData.projectId,
        templateId: validatedData.templateId,
      },
    });

    if (existingSubmission) {
      return apiErrors.badRequest('Submission already exists for this project and template');
    }

    // Create submission draft
    const submission = await prisma.questionnaire_submissions.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: context.tenantId,
        projectId: validatedData.projectId,
        templateId: validatedData.templateId,
        updatedAt: new Date(),
      },
      include: {
        template: {
          select: { id: true, name: true, version: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error('Failed to create submission:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid submission data');
    }

    return apiErrors.internalError('Failed to create questionnaire submission');
  }
});

// PATCH /api/questionnaires/submissions/[id] - Update submission (add/edit answers)
export const PATCH = guards.authenticated(async (request, context, params) => {
  try {
    const submissionId = params?.id || new URL(request.url).searchParams.get('id');
    if (!submissionId) {
      return apiErrors.badRequest('Submission ID is required');
    }

    const body = await request.json();
    const validatedData = SubmitAnswerSchema.parse(body) as SubmitAnswerInput;

    // Get submission with template and existing answers
    const submission = await prisma.questionnaire_submissions.findFirst({
      where: {
        id: submissionId,
        tenantId: context.tenantId,
        status: 'DRAFT', // Only allow editing drafts
      },
      include: {
        template: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!submission) {
      return apiErrors.forbidden('Submission not found, not a draft, or access denied');
    }

    // Verify question belongs to template
    const question = submission.template.questions.find(
      (q: any) => q.id === validatedData.questionId
    );
    if (!question) {
      return apiErrors.badRequest('Question not found in template');
    }

    // Check conditional logic
    if (question.config && typeof question.config === 'object' && 'conditions' in question.config) {
      const conditions = (question.config as any).conditions || [];
      if (conditions.length > 0) {
        const previousAnswers = submission.answers.reduce(
          (acc, answer) => {
            acc[answer.questionId] = answer.value as AnswerValue;
            return acc;
          },
          {} as Record<string, AnswerValue>
        );

        const conditionsMet = evaluateConditions(conditions, previousAnswers);
        if (!conditionsMet) {
          return apiErrors.badRequest('Question conditions not met');
        }
      }
    }

    // Validate answer against question config
    const isValid = validateAnswerAgainstConfig(validatedData.value, question.config as any);
    if (!isValid) {
      return apiErrors.badRequest('Answer does not meet question validation requirements');
    }

    // Create or update answer
    const answer = await prisma.answers.upsert({
      where: {
        submissionId_questionId: {
          submissionId,
          questionId: validatedData.questionId,
        },
      },
      update: {
        value: validatedData.value,
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        tenantId: context.tenantId,
        submissionId,
        questionId: validatedData.questionId,
        projectId: submission.projectId,
        value: validatedData.value as any,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Failed to update submission:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid answer data');
    }

    return apiErrors.internalError('Failed to update questionnaire submission');
  }
});
