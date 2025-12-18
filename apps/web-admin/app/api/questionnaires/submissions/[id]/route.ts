import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@horizon/db"
import { guards, apiErrors } from "@/lib/security/guards"
import { runtime } from "@/lib/api-runtime"

// GET /api/questionnaires/submissions/[id] - Get submission with questions and answers
export const GET = guards.authenticated(async (request, context) => {
  const { params } = request as any // Next.js params handling

  try {
    const submissionId = params.id

    if (!submissionId) {
      return apiErrors.badRequest("Submission ID is required")
    }

    // Get submission with full details
    const submission = await prisma.questionnaireSubmission.findFirst({
      where: {
        id: submissionId,
        tenantId: context.tenantId,
      },
      include: {
        template: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        project: {
          select: { id: true, name: true, description: true },
        },
        answers: {
          include: {
            question: true,
          },
          orderBy: {
            question: { order: "asc" },
          },
        },
      },
    })

    if (!submission) {
      return apiErrors.forbidden("Submission not found or access denied")
    }

    // Transform the response to include unanswered questions for completeness
    const answeredQuestionIds = new Set((submission as any).answers.map((a: any) => a.questionId))
    const unansweredQuestions = (submission as any).template.questions
      .filter((q: any) => !answeredQuestionIds.has(q.id))
      .map((q: any) => ({
        question: q,
        answer: null,
      }))

    const completeResponses = [
      ...(submission as any).answers.map((answer: any) => ({
        question: answer.question,
        answer: answer,
      })),
      ...unansweredQuestions,
    ].sort((a: any, b: any) => a.question.order - b.question.order)

    return NextResponse.json({
      submission: {
        ...submission,
        responses: completeResponses,
      },
    })
  } catch (error) {
    console.error("Failed to fetch submission:", error)
    return apiErrors.internalError("Failed to fetch questionnaire submission")
  }
})
