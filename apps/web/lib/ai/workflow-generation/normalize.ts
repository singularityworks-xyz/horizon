// Step 1: Normalize submission data for AI processing
// Extracts and normalizes questionnaire answers into a consistent format

import { prisma } from '@horizon/db';
import type { NormalizedSubmission } from './index';

export async function normalizeSubmission(
  submissionId: string
): Promise<NormalizedSubmission | null> {
  try {
    // Load submission with template and answers
    const submission = await prisma.questionnaire_submissions.findUnique({
      where: { id: submissionId },
      include: {
        template: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                title: true,
                type: true,
                config: true,
              },
            },
          },
        },
      },
    });

    if (!submission || !submission.project) {
      return null;
    }

    // Normalize answers into consistent format
    const normalizedAnswers = submission.answers.map((answer: any) => ({
      questionId: answer.questionId,
      questionTitle: answer.question.title,
      questionType: answer.question.type,
      value: normalizeAnswerValue(answer.value, answer.question.config as any),
    }));

    return {
      submissionId,
      projectId: submission.project.id,
      tenantId: submission.tenantId,
      answers: normalizedAnswers,
      template: submission.template,
    };
  } catch (error) {
    console.error('Failed to normalize submission:', error);
    return null;
  }
}

// Normalize answer values into consistent types for AI processing
function normalizeAnswerValue(rawValue: any, config: any): any {
  // Handle different answer types consistently
  switch (config?.type) {
    case 'TEXT':
    case 'TEXTAREA':
    case 'URL':
      return typeof rawValue === 'string' ? rawValue : String(rawValue || '');

    case 'NUMBER': {
      const num = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
      return isNaN(num) ? 0 : num;
    }

    case 'SELECT':
      return typeof rawValue === 'string' ? rawValue : String(rawValue || '');

    case 'MULTI_SELECT':
      if (Array.isArray(rawValue)) {
        return rawValue.filter((v) => typeof v === 'string');
      }
      return [];

    case 'DATE':
      // Return as ISO string for consistency
      if (rawValue instanceof Date) {
        return rawValue.toISOString();
      }
      return typeof rawValue === 'string' ? rawValue : null;

    case 'FILE_UPLOAD':
      // For AI processing, we just need to know if files were uploaded
      return Array.isArray(rawValue) && rawValue.length > 0;

    default:
      return rawValue;
  }
}
