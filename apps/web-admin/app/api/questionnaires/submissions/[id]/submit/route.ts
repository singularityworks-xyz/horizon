import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@horizon/db"
import { guards, apiErrors } from "@/lib/security/guards"
import { runtime } from "@/lib/api-runtime"
import { validateAnswerAgainstConfig } from "@/lib/questionnaire/validation"

// POST /api/questionnaires/submissions/[id]/submit - Submit draft for AI processing
export const POST = guards.authenticated(async (request, context) => {
  const { params } = request as any // Next.js params handling

  try {
    const submissionId = params.id

    if (!submissionId) {
      return apiErrors.badRequest("Submission ID is required")
    }

    // Get submission with template and answers
    const submission = await prisma.questionnaireSubmission.findFirst({
      where: {
        id: submissionId,
        tenantId: context.tenantId,
        status: "DRAFT",
      },
      include: {
        template: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
      },
    })

    if (!submission) {
      return apiErrors.forbidden("Submission not found, not a draft, or access denied")
    }

    // Validate all required questions are answered
    const requiredQuestions = submission.template.questions.filter(q => q.required)
    const answeredQuestionIds = new Set(submission.answers.map(a => a.questionId))
    const missingRequired = requiredQuestions.filter(q => !answeredQuestionIds.has(q.id))

    if (missingRequired.length > 0) {
      return apiErrors.badRequest(
        `Missing answers for required questions: ${missingRequired.map(q => q.title).join(", ")}`
      )
    }

    // Validate all answers against their configs
    const invalidAnswers = []
    for (const answer of submission.answers) {
      const question = submission.template.questions.find(q => q.id === answer.questionId)
      if (question) {
        const isValid = validateAnswerAgainstConfig(answer.value as any, question.config as any)
        if (!isValid) {
          invalidAnswers.push(question.title)
        }
      }
    }

    if (invalidAnswers.length > 0) {
      return apiErrors.badRequest(
        `Invalid answers for questions: ${invalidAnswers.join(", ")}`
      )
    }

    // Submit the questionnaire
    const updatedSubmission = await prisma.questionnaireSubmission.update({
      where: { id: submissionId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
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
    })

    return NextResponse.json({
      submission: updatedSubmission,
      message: "Questionnaire submitted successfully for AI processing"
    })
  } catch (error) {
    console.error("Failed to submit questionnaire:", error)
    return apiErrors.internalError("Failed to submit questionnaire")
  }
})
