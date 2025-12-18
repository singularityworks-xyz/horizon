import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@horizon/db"
import { guards, apiErrors } from "@/lib/security/guards"
import { runtime } from "@/lib/api-runtime"
import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
  CreateQuestionInput,
  UpdateQuestionInput,
} from "@/lib/questionnaire/validation"

// GET /api/questionnaires/templates/[templateId]/questions - List questions for template
export const GET = guards.adminOnly(async (request, context) => {
  const { params } = request as any // Next.js params handling

  try {
    const templateId = params.templateId

    // Verify template belongs to tenant
    const template = await prisma.questionnaireTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: context.tenantId,
      },
    })

    if (!template) {
      return apiErrors.forbidden("Template not found or access denied")
    }

    const questions = await prisma.question.findMany({
      where: {
        templateId,
      },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { answers: true },
        },
      },
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("Failed to fetch questions:", error)
    return apiErrors.internalError("Failed to fetch questions")
  }
})

// POST /api/questionnaires/templates/[templateId]/questions - Create new question
export const POST = guards.adminOnly(async (request, context) => {
  const { params } = request as any // Next.js params handling

  try {
    const templateId = params.templateId
    const body = await request.json()

    // Verify template belongs to tenant and is active
    const template = await prisma.questionnaireTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: context.tenantId,
        isActive: true,
      },
    })

    if (!template) {
      return apiErrors.forbidden("Template not found, inactive, or access denied")
    }

    // Validate input
    const validatedData = CreateQuestionSchema.parse(body) as CreateQuestionInput

    // Check for duplicate order in this template
    const existingQuestion = await prisma.question.findFirst({
      where: {
        templateId,
        order: validatedData.order,
      },
    })

    if (existingQuestion) {
      return apiErrors.badRequest("Question order must be unique within template")
    }

    // Create question
    const question = await prisma.question.create({
      data: {
        ...validatedData,
        templateId,
        config: validatedData.config ? JSON.parse(JSON.stringify(validatedData.config)) : null,
      },
    })

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    console.error("Failed to create question:", error)

    if (error instanceof Error && error.name === "ZodError") {
      return apiErrors.badRequest("Invalid question data")
    }

    return apiErrors.internalError("Failed to create question")
  }
})

// PATCH /api/questionnaires/templates/[templateId]/questions/[questionId] - Update question
export const PATCH = guards.adminOnly(async (request, context) => {
  const { params, url } = request as any // Next.js params handling
  const { searchParams } = new URL(url)
  const questionId = searchParams.get("questionId")

  try {
    const templateId = params.templateId

    if (!questionId) {
      return apiErrors.badRequest("Question ID is required")
    }

    const body = await request.json()
    const validatedData = UpdateQuestionSchema.parse(body) as UpdateQuestionInput

    // Verify question belongs to template and tenant
    const existingQuestion = await prisma.question.findFirst({
      where: {
        id: questionId,
        templateId,
        template: {
          tenantId: context.tenantId,
          isActive: true,
        },
      },
    })

    if (!existingQuestion) {
      return apiErrors.forbidden("Question not found or access denied")
    }

    // Check for duplicate order if order is being changed
    if (validatedData.order !== undefined && validatedData.order !== existingQuestion.order) {
      const duplicateOrder = await prisma.question.findFirst({
        where: {
          templateId,
          order: validatedData.order,
          id: { not: questionId },
        },
      })

      if (duplicateOrder) {
        return apiErrors.badRequest("Question order must be unique within template")
      }
    }

    // Update question
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...validatedData,
        config: validatedData.config ? JSON.parse(JSON.stringify(validatedData.config)) : undefined,
      },
    })

    return NextResponse.json({ question })
  } catch (error) {
    console.error("Failed to update question:", error)

    if (error instanceof Error && error.name === "ZodError") {
      return apiErrors.badRequest("Invalid question data")
    }

    return apiErrors.internalError("Failed to update question")
  }
})

// DELETE /api/questionnaires/templates/[templateId]/questions/[questionId] - Delete question
export const DELETE = guards.adminOnly(async (request, context) => {
  const { params, url } = request as any // Next.js params handling
  const { searchParams } = new URL(url)
  const questionId = searchParams.get("questionId")

  try {
    const templateId = params.templateId

    if (!questionId) {
      return apiErrors.badRequest("Question ID is required")
    }

    // Verify question belongs to template and tenant, and check for answers
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        templateId,
        template: {
          tenantId: context.tenantId,
          isActive: true,
        },
      },
      include: {
        _count: {
          select: { answers: true },
        },
      },
    })

    if (!question) {
      return apiErrors.forbidden("Question not found or access denied")
    }

    // Prevent deletion if question has been answered
    if (question._count.answers > 0) {
      return apiErrors.badRequest("Cannot delete question that has been answered")
    }

    // Delete question
    await prisma.question.delete({
      where: { id: questionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete question:", error)
    return apiErrors.internalError("Failed to delete question")
  }
})
