import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { generateWorkflowFromSubmission } from '@/lib/ai/workflow-generation';
import { validateAnswerAgainstConfig } from '@/lib/questionnaire/validation';
import { apiErrors, guards } from '@/lib/security/guards';

// POST /api/questionnaires/submissions/[id]/submit - Submit draft for AI processing
export const POST = guards.authenticated(async (request, context, params) => {
  try {
    const submissionId = params?.id || new URL(request.url).searchParams.get('id');

    if (!submissionId) {
      return apiErrors.badRequest('Submission ID is required');
    }

    // Get submission with template and answers
    const submission = await prisma.questionnaire_submissions.findFirst({
      where: {
        id: submissionId,
        tenantId: context.tenantId,
        status: 'DRAFT',
      },
      include: {
        questionnaire_templates: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
        answers: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!submission) {
      return apiErrors.forbidden('Submission not found, not a draft, or access denied');
    }

    // Validate all required questions are answered
    const requiredQuestions = (submission as any).questionnaire_templates.questions.filter(
      (q: any) => q.required
    );
    const answeredQuestionIds = new Set(submission.answers.map((a: any) => a.questionId));
    const missingRequired = requiredQuestions.filter((q: any) => !answeredQuestionIds.has(q.id));

    if (missingRequired.length > 0) {
      return apiErrors.badRequest(
        `Missing answers for required questions: ${missingRequired.map((q: any) => q.title).join(', ')}`
      );
    }

    // Validate all answers against their configs
    const invalidAnswers = [];
    for (const answer of submission.answers) {
      const question = (submission as any).questionnaire_templates.questions.find(
        (q: any) => q.id === answer.questionId
      );
      if (question) {
        const isValid = validateAnswerAgainstConfig(answer.value as any, question.config as any);
        if (!isValid) {
          invalidAnswers.push(question.title);
        }
      }
    }

    if (invalidAnswers.length > 0) {
      return apiErrors.badRequest(`Invalid answers for questions: ${invalidAnswers.join(', ')}`);
    }

    // Submit the questionnaire
    const updatedSubmission = await prisma.questionnaire_submissions.update({
      where: { id: submissionId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        questionnaire_templates: {
          select: { id: true, name: true, version: true },
        },
        projects: {
          select: { id: true, name: true },
        },
        _count: {
          select: { answers: true },
        },
      },
    });

    // Trigger AI workflow generation asynchronously (fire and forget)
    generateWorkflowFromSubmission(
      {
        tenantId: context.tenantId,
        scope: 'ai.workflow.generate',
        requestId: `submit-${submissionId}-${Date.now()}`,
        caller: 'submission.submit',
      },
      submissionId
    ).catch((error) => {
      console.error('Workflow generation failed for submission:', submissionId, error);
      // Don't fail the submission if workflow generation fails
    });

    return NextResponse.json({
      submission: updatedSubmission,
      message: 'Questionnaire submitted successfully. AI workflow generation has been initiated.',
      workflowGeneration: {
        status: 'initiated',
        message: 'Workflow generation will complete asynchronously',
      },
    });
  } catch (error) {
    console.error('Failed to submit questionnaire:', error);
    return apiErrors.internalError('Failed to submit questionnaire');
  }
});
