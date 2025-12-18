import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@horizon/db"
import { guards, apiErrors } from "@/lib/security/guards"
import {
  CreateSubmissionSchema,
  SubmitAnswerSchema,
  CreateSubmissionInput,
  SubmitAnswerInput,
  validateAnswerAgainstConfig,
  evaluateConditions,
  AnswerValue,
} from "@/lib/questionnaire/validation"

export const runtime = "nodejs"

// GET /api/questionnaires/submissions - List submissions for tenant
export const GET = guards.authenticated(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const templateId = searchParams.get("templateId")
    const status = searchParams.get("status") as any

    const submissions = await prisma.questionnaireSubmission.findMany({
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
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error("Failed to fetch submissions:", error)
    return apiErrors.internalError("Failed to fetch questionnaire submissions")
  }
})

// POST /api/questionnaires/submissions - Create new submission draft
export const POST = guards.authenticated(async (request, context) => {
  try {
    const body = await request.json()
    const validatedData = CreateSubmissionSchema.parse(body) as CreateSubmissionInput

    // Verify template belongs to tenant and is active
    const template = await prisma.questionnaireTemplate.findFirst({
      where: {
        id: validatedData.templateId,
        tenantId: context.tenantId,
        isActive: true,
      },
    })

    if (!template) {
      return apiErrors.forbidden("Template not found, inactive, or access denied")
    }

    // Verify project belongs to tenant if specified
    if (validatedData.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          tenantId: context.tenantId,
        },
      })

      if (!project) {
        return apiErrors.forbidden("Project not found or access denied")
      }
    }

    // Check if submission already exists for this project-template combination
    const existingSubmission = await prisma.questionnaireSubmission.findFirst({
      where: {
        tenantId: context.tenantId,
        projectId: validatedData.projectId,
        templateId: validatedData.templateId,
      },
    })

    if (existingSubmission) {
      return apiErrors.badRequest("Submission already exists for this project and template")
    }

    // Create submission draft
    const submission = await prisma.questionnaireSubmission.create({
      data: {
        tenantId: context.tenantId,
        projectId: validatedData.projectId,
        templateId: validatedData.templateId,
      },
      include: {
        template: {
          select: { id: true, name: true, version: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ submission }, { status: 201 })
  } catch (error) {
    console.error("Failed to create submission:", error)

    if (error instanceof Error && error.name === "ZodError") {
      return apiErrors.badRequest("Invalid submission data")
    }

    return apiErrors.internalError("Failed to create questionnaire submission")
  }
})

// PATCH /api/questionnaires/submissions/[id] - Update submission (add/edit answers)
export const PATCH = guards.authenticated(async (request, context) => {
  const { params, url } = request as any // Next.js params handling
  const { searchParams } = new URL(url)
  const submissionId = searchParams.get("id")

  try {
    if (!submissionId) {
      return apiErrors.badRequest("Submission ID is required")
    }

    const body = await request.json()
    const validatedData = SubmitAnswerSchema.parse(body) as SubmitAnswerInput

    // Get submission with template and existing answers
    const submission = await prisma.questionnaireSubmission.findFirst({
      where: {
        id: submissionId,
        tenantId: context.tenantId,
        status: "DRAFT", // Only allow editing drafts
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

    // Verify question belongs to template
    const question = submission.template.questions.find(q => q.id === validatedData.questionId)
    if (!question) {
      return apiErrors.badRequest("Question not found in template")
    }

    // Check conditional logic
    if (question.config && typeof question.config === 'object' && 'conditions' in question.config) {
      const conditions = (question.config as any).conditions || []
      if (conditions.length > 0) {
        const previousAnswers = submission.answers.reduce((acc, answer) => {
          acc[answer.questionId] = answer.value as AnswerValue
          return acc
        }, {} as Record<string, AnswerValue>)

        const conditionsMet = evaluateConditions(conditions, previousAnswers)
        if (!conditionsMet) {
          return apiErrors.badRequest("Question conditions not met")
        }
      }
    }

    // Validate answer against question config
    const isValid = validateAnswerAgainstConfig(validatedData.value, question.config as any)
    if (!isValid) {
      return apiErrors.badRequest("Answer does not meet question validation requirements")
    }

    // Create or update answer
    const answer = await prisma.answer.upsert({
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
        tenantId: context.tenantId,
        submissionId,
        questionId: validatedData.questionId,
        projectId: submission.projectId,
        value: validatedData.value,
      },
    })

    return NextResponse.json({ answer })
  } catch (error) {
    console.error("Failed to update submission:", error)

    if (error instanceof Error && error.name === "ZodError") {
      return apiErrors.badRequest("Invalid answer data")
    }

    return apiErrors.internalError("Failed to update questionnaire submission")
  }
})
