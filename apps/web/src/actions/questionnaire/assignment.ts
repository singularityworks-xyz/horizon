"use server";

import { auth } from "@horizon/auth";
import prisma, { type QuestionnaireStatus } from "@horizon/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ============================================================================
// Types
// ============================================================================

export type ProjectQuestionnaireWithDetails = Awaited<
  ReturnType<typeof getProjectQuestionnaire>
>;

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// Helpers
// ============================================================================

async function requireAdminSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }

  return session;
}

async function requireAuthSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

// ============================================================================
// Assignment Actions (ProjectQuestionnaire)
// ============================================================================

/**
 * Assign a questionnaire template to a project (Admin only)
 */
export async function assignTemplateToProject(
  projectId: string,
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    // Check if this template is already assigned to the project
    const existing = await prisma.projectQuestionnaire.findFirst({
      where: {
        projectId,
        templateId,
      },
    });

    if (existing) {
      return {
        success: false,
        error: "This template is already assigned to the project",
      };
    }

    const projectQuestionnaire = await prisma.projectQuestionnaire.create({
      data: {
        projectId,
        templateId,
        status: "DRAFT",
      },
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath("/dashboard/questionnaire");

    return { success: true, data: { id: projectQuestionnaire.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to assign template",
    };
  }
}

/**
 * Get a project questionnaire with all details
 * Admin can view any, Client can only view their own project's questionnaires
 */
export async function getProjectQuestionnaire(projectQuestionnaireId: string) {
  const session = await requireAuthSession();

  const pq = await prisma.projectQuestionnaire.findUnique({
    where: { id: projectQuestionnaireId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          clientId: true,
          type: true,
          client: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      template: {
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
        },
      },
      answers: true,
    },
  });

  if (!pq) {
    return null;
  }

  // Non-admin users can only view their own project's questionnaires
  if (
    session.user.role !== "ADMIN" &&
    pq.project.clientId !== session.user.id
  ) {
    throw new Error("Forbidden: You can only view your own questionnaires");
  }

  return pq;
}

/**
 * Update questionnaire status (Admin or System)
 */
export async function updateQuestionnaireStatus(
  projectQuestionnaireId: string,
  status: QuestionnaireStatus
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAuthSession();

    const pq = await prisma.projectQuestionnaire.findUnique({
      where: { id: projectQuestionnaireId },
      include: {
        project: {
          select: { clientId: true },
        },
      },
    });

    if (!pq) {
      return { success: false, error: "Questionnaire not found" };
    }

    // Only admin can manually change status, or client can submit their own
    const isAdmin = session.user.role === "ADMIN";
    const isOwner = pq.project.clientId === session.user.id;

    if (!(isAdmin || isOwner)) {
      return { success: false, error: "Forbidden" };
    }

    // Clients can only change from DRAFT to SUBMITTED
    if (!(isAdmin || (pq.status === "DRAFT" && status === "SUBMITTED"))) {
      return {
        success: false,
        error: "You can only submit draft questionnaires",
      };
    }

    const updated = await prisma.projectQuestionnaire.update({
      where: { id: projectQuestionnaireId },
      data: {
        status,
        ...(status === "SUBMITTED" && { submittedAt: new Date() }),
      },
    });

    revalidatePath(`/admin/projects/${pq.project}`);
    revalidatePath("/dashboard/questionnaire");

    return { success: true, data: { id: updated.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

/**
 * Get all questionnaires for a project
 * Admin can view any, Client can only view their own project's questionnaires
 */
export async function getQuestionnairesByProject(projectId: string) {
  const session = await requireAuthSession();

  // Check project ownership for non-admin users
  if (session.user.role !== "ADMIN") {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { clientId: true },
    });

    if (!project || project.clientId !== session.user.id) {
      throw new Error(
        "Forbidden: You can only view your own project's questionnaires"
      );
    }
  }

  const questionnaires = await prisma.projectQuestionnaire.findMany({
    where: { projectId },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      _count: {
        select: { answers: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return questionnaires;
}

/**
 * Get all pending questionnaires for a client (Client view)
 */
export async function getClientPendingQuestionnaires() {
  const session = await requireAuthSession();

  const questionnaires = await prisma.projectQuestionnaire.findMany({
    where: {
      project: {
        clientId: session.user.id,
      },
      status: "DRAFT",
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      template: {
        include: {
          questions: {
            select: { id: true },
          },
        },
      },
      _count: {
        select: { answers: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return questionnaires.map((q) => ({
    ...q,
    totalQuestions: q.template.questions?.length ?? 0,
    answeredQuestions: q._count.answers,
  }));
}

/**
 * Delete a project questionnaire (Admin only)
 */
export async function deleteProjectQuestionnaire(
  projectQuestionnaireId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    const pq = await prisma.projectQuestionnaire.delete({
      where: { id: projectQuestionnaireId },
    });

    revalidatePath(`/admin/projects/${pq.projectId}`);
    revalidatePath("/dashboard/questionnaire");

    return { success: true, data: { id: projectQuestionnaireId } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete questionnaire",
    };
  }
}
