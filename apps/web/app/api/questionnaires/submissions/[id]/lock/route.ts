import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { generateWorkflowFromSubmission } from '@/lib/ai/workflow-generation';
import { runtime } from '@/lib/api-runtime';
import { apiErrors, guards } from '@/lib/security/guards';

// POST /api/questionnaires/submissions/[id]/lock - Lock submission (final version)
export const POST = guards.adminOnly(async (request, context, params) => {
  try {
    const submissionId = params?.id || new URL(request.url).searchParams.get('id');

    if (!submissionId) {
      return apiErrors.badRequest('Submission ID is required');
    }

    // Get submission
    const submission = await prisma.questionnaire_submissions.findFirst({
      where: {
        id: submissionId,
        tenantId: context.tenantId,
        status: 'SUBMITTED', // Only allow locking submitted questionnaires
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

    if (!submission) {
      return apiErrors.forbidden('Submission not found, not submitted, or access denied');
    }

    // Lock the questionnaire
    const updatedSubmission = await prisma.questionnaire_submissions.update({
      where: { id: submissionId },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
      },
      include: {
        template: {
          select: { id: true, name: true, version: true },
        },
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { answers: true },
        },
      },
    });

    // Trigger AI workflow generation with timeout (don't block admin response)
    let workflowGenerationResult: any = null;
    try {
      const generationPromise = generateWorkflowFromSubmission(
        {
          tenantId: context.tenantId,
          scope: 'ai.workflow.generate',
          requestId: `lock-${submissionId}-${Date.now()}`,
          caller: 'submission.lock',
        },
        submissionId
      );

      // Wait up to 10 seconds for workflow generation to complete
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      );

      workflowGenerationResult = await Promise.race([generationPromise, timeoutPromise]);
    } catch (error) {
      // If generation fails or times out, log but don't fail the lock
      console.error(
        'Workflow generation failed or timed out for locked submission:',
        submissionId,
        error
      );
      workflowGenerationResult = {
        status: error instanceof Error && error.message === 'timeout' ? 'pending' : 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return NextResponse.json({
      submission: updatedSubmission,
      message: 'Questionnaire locked successfully. AI workflow generation has been initiated.',
      workflowGeneration: workflowGenerationResult || {
        status: 'initiated',
        message: 'Workflow generation started in background',
      },
    });
  } catch (error) {
    console.error('Failed to lock questionnaire:', error);
    return apiErrors.internalError('Failed to lock questionnaire');
  }
});
