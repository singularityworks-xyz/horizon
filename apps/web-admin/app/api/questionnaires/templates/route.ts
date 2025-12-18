import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@horizon/db"
import { guards, apiErrors } from "@/lib/security/guards"
import { runtime } from "@/lib/api-runtime"
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "@/lib/questionnaire/validation"

// GET /api/questionnaires/templates - List templates for tenant
export const GET = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const includeInactive = searchParams.get("includeInactive") === "true"

    const templates = await prisma.questionnaireTemplate.findMany({
      where: {
        tenantId: context.tenantId,
        ...(projectId && { projectId }),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { questions: true, submissions: true },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { version: "desc" },
        { updatedAt: "desc" },
      ],
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Failed to fetch templates:", error)
    return apiErrors.internalError("Failed to fetch questionnaire templates")
  }
})

// POST /api/questionnaires/templates - Create new template
export const POST = guards.adminOnly(async (request, context) => {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = CreateTemplateSchema.parse(body) as CreateTemplateInput

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

    // Create template with version 1
    const template = await prisma.questionnaireTemplate.create({
      data: {
        ...validatedData,
        tenantId: context.tenantId,
        version: 1,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error("Failed to create template:", error)

    if (error instanceof Error && error.name === "ZodError") {
      return apiErrors.badRequest("Invalid template data")
    }

    return apiErrors.internalError("Failed to create questionnaire template")
  }
})

// PATCH /api/questionnaires/templates/[id] - Update template
export const PATCH = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get("id")

    if (!templateId) {
      return apiErrors.badRequest("Template ID is required")
    }

    const body = await request.json()
    const validatedData = UpdateTemplateSchema.parse(body) as UpdateTemplateInput

    // Update template
    const template = await prisma.questionnaireTemplate.update({
      where: {
        id: templateId,
        tenantId: context.tenantId,
      },
      data: validatedData,
      include: {
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { questions: true, submissions: true },
        },
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Failed to update template:", error)

    if (error instanceof Error && error.name === "ZodError") {
      return apiErrors.badRequest("Invalid template data")
    }

    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return apiErrors.forbidden("Template not found or access denied")
    }

    return apiErrors.internalError("Failed to update questionnaire template")
  }
})

// DELETE /api/questionnaires/templates/[id] - Delete template (soft delete by deactivating)
export const DELETE = guards.adminOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get("id")

    if (!templateId) {
      return apiErrors.badRequest("Template ID is required")
    }

    // Check if template has active submissions
    const submissionCount = await prisma.questionnaireSubmission.count({
      where: {
        templateId,
        tenantId: context.tenantId,
        status: { in: ["DRAFT", "SUBMITTED"] },
      },
    })

    if (submissionCount > 0) {
      return apiErrors.badRequest("Cannot delete template with active submissions")
    }

    // Soft delete by deactivating
    const template = await prisma.questionnaireTemplate.update({
      where: {
        id: templateId,
        tenantId: context.tenantId,
      },
      data: { isActive: false },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Failed to delete template:", error)

    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return apiErrors.forbidden("Template not found or access denied")
    }

    return apiErrors.internalError("Failed to delete questionnaire template")
  }
})
