import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@horizon/db"
import { guards, apiErrors } from "@/lib/security/guards"

export const runtime = "nodejs"

// POST /api/questionnaires/templates/[templateId]/clone - Clone template to new version
export const POST = guards.adminOnly(async (request, context) => {
  const { params } = request as any // Next.js params handling

  try {
    const templateId = params.templateId

    if (!templateId) {
      return apiErrors.badRequest("Template ID is required")
    }

    // Get the original template with questions
    const originalTemplate = await prisma.questionnaireTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: context.tenantId,
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    })

    if (!originalTemplate) {
      return apiErrors.forbidden("Template not found or access denied")
    }

    // Create transaction to clone template and questions
    const result = await prisma.$transaction(async (tx) => {
      // Create new template version
      const newTemplate = await tx.questionnaireTemplate.create({
        data: {
          tenantId: context.tenantId,
          projectId: originalTemplate.projectId,
          name: originalTemplate.name,
          description: originalTemplate.description,
          version: originalTemplate.version + 1,
          isActive: false, // Start as inactive
        },
      })

      // Clone all questions
      if (originalTemplate.questions.length > 0) {
        await tx.question.createMany({
          data: originalTemplate.questions.map((question) => ({
            templateId: newTemplate.id,
            type: question.type,
            title: question.title,
            description: question.description,
            config: question.config as any, // JSON type compatibility
            order: question.order,
            required: question.required,
          })),
        })
      }

      // Return the new template with questions
      return await tx.questionnaireTemplate.findUnique({
        where: { id: newTemplate.id },
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
          project: {
            select: { id: true, name: true },
          },
        },
      })
    })

    return NextResponse.json({ template: result }, { status: 201 })
  } catch (error) {
    console.error("Failed to clone template:", error)
    return apiErrors.internalError("Failed to clone questionnaire template")
  }
})
