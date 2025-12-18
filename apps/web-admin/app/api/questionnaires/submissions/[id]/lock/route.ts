import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@horizon/db"
import { guards, apiErrors } from "@/lib/security/guards"

export const runtime = "nodejs"

// POST /api/questionnaires/submissions/[id]/lock - Lock submission (final version)
export const POST = guards.adminOnly(async (request, context) => {
  const { params } = request as any // Next.js params handling

  try {
    const submissionId = params.id

    if (!submissionId) {
      return apiErrors.badRequest("Submission ID is required")
    }

    // Get submission
    const submission = await prisma.questionnaireSubmission.findFirst({
      where: {
        id: submissionId,
        tenantId: context.tenantId,
        status: "SUBMITTED", // Only allow locking submitted questionnaires
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

    if (!submission) {
      return apiErrors.forbidden("Submission not found, not submitted, or access denied")
    }

    // Lock the questionnaire
    const updatedSubmission = await prisma.questionnaireSubmission.update({
      where: { id: submissionId },
      data: {
        status: "LOCKED",
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
    })

    return NextResponse.json({
      submission: updatedSubmission,
      message: "Questionnaire locked successfully"
    })
  } catch (error) {
    console.error("Failed to lock questionnaire:", error)
    return apiErrors.internalError("Failed to lock questionnaire")
  }
})
