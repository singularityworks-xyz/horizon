"use server";

import { auth } from "@horizon/auth";
import prisma, { type Prisma } from "@horizon/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ============================================================================
// Types
// ============================================================================

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type AnswerValue = Prisma.InputJsonValue;

// ============================================================================
// Helpers
// ============================================================================

async function requireAuthSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

async function verifyQuestionnaireAccess(
  projectQuestionnaireId: string,
  userId: string,
  role: string
) {
  const pq = await prisma.projectQuestionnaire.findUnique({
    where: { id: projectQuestionnaireId },
    include: {
      project: {
        select: { clientId: true },
      },
    },
  });

  if (!pq) {
    throw new Error("Questionnaire not found");
  }

  // Admin can access any, clients can only access their own
  if (role !== "ADMIN" && pq.project.clientId !== userId) {
    throw new Error(
      "Forbidden: You can only modify your own questionnaire answers"
    );
  }

  return pq;
}

// ============================================================================
// Answer Actions
// ============================================================================

/**
 * Save or update a single answer (auto-save functionality)
 */
export async function saveAnswer(
  projectQuestionnaireId: string,
  questionId: string,
  value: AnswerValue
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAuthSession();
    const userId = session.user.id;
    const userRole = session.user.role;

    if (!(userId && userRole)) {
      return { success: false, error: "User not found" };
    }

    const pq = await verifyQuestionnaireAccess(
      projectQuestionnaireId,
      userId,
      userRole
    );

    // Check if questionnaire is still editable
    if (pq.status === "LOCKED") {
      return {
        success: false,
        error: "Questionnaire is locked and cannot be modified",
      };
    }

    if (pq.status === "SUBMITTED") {
      return {
        success: false,
        error: "Questionnaire has been submitted and cannot be modified",
      };
    }

    // Check if answer already exists
    const existing = await prisma.answer.findFirst({
      where: {
        projectQuestionnaireId,
        questionId,
      },
    });

    let answer;
    if (existing) {
      answer = await prisma.answer.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      answer = await prisma.answer.create({
        data: {
          projectQuestionnaireId,
          questionId,
          value,
        },
      });
    }

    return { success: true, data: { id: answer.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save answer",
    };
  }
}

/**
 * Bulk save answers (for form submission)
 */
export async function saveAnswers(
  projectQuestionnaireId: string,
  answers: Array<{ questionId: string; value: AnswerValue }>
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await requireAuthSession();
    const userId = session.user.id;
    const userRole = session.user.role;

    if (!(userId && userRole)) {
      return { success: false, error: "User not found" };
    }

    const pq = await verifyQuestionnaireAccess(
      projectQuestionnaireId,
      userId,
      userRole
    );

    // Check if questionnaire is still editable
    if (pq.status === "LOCKED") {
      return {
        success: false,
        error: "Questionnaire is locked and cannot be modified",
      };
    }

    if (pq.status === "SUBMITTED") {
      return {
        success: false,
        error: "Questionnaire has been submitted and cannot be modified",
      };
    }

    // Process each answer
    for (const ans of answers) {
      const existing = await prisma.answer.findFirst({
        where: {
          projectQuestionnaireId,
          questionId: ans.questionId,
        },
      });

      if (existing) {
        await prisma.answer.update({
          where: { id: existing.id },
          data: { value: ans.value },
        });
      } else {
        await prisma.answer.create({
          data: {
            projectQuestionnaireId,
            questionId: ans.questionId,
            value: ans.value,
          },
        });
      }
    }

    revalidatePath("/dashboard/questionnaire");

    return { success: true, data: { count: answers.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save answers",
    };
  }
}

/**
 * Get all answers for a questionnaire
 */
export async function getAnswersByQuestionnaire(
  projectQuestionnaireId: string
) {
  const session = await requireAuthSession();
  const userId = session.user.id;
  const userRole = session.user.role;

  if (!(userId && userRole)) {
    throw new Error("User not found");
  }

  await verifyQuestionnaireAccess(projectQuestionnaireId, userId, userRole);

  const answers = await prisma.answer.findMany({
    where: { projectQuestionnaireId },
    include: {
      question: {
        select: {
          id: true,
          label: true,
          type: true,
          required: true,
          order: true,
        },
      },
    },
    orderBy: {
      question: {
        order: "asc",
      },
    },
  });

  return answers;
}

/**
 * Submit a questionnaire (mark as SUBMITTED)
 */
export async function submitQuestionnaire(
  projectQuestionnaireId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAuthSession();
    const userId = session.user.id;
    const userRole = session.user.role;

    if (!(userId && userRole)) {
      return { success: false, error: "User not found" };
    }

    const pq = await verifyQuestionnaireAccess(
      projectQuestionnaireId,
      userId,
      userRole
    );

    if (pq.status !== "DRAFT") {
      return {
        success: false,
        error: `Cannot submit: Questionnaire is already ${pq.status.toLowerCase()}`,
      };
    }

    // Validate all required questions are answered
    const template = await prisma.questionnaireTemplate.findUnique({
      where: { id: pq.templateId },
      include: {
        questions: {
          where: { required: true },
          select: { id: true },
        },
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    const requiredQuestionIds = template.questions.map((q) => q.id);

    const answeredQuestions = await prisma.answer.findMany({
      where: {
        projectQuestionnaireId,
        questionId: { in: requiredQuestionIds },
      },
      select: { questionId: true },
    });

    const answeredIds = new Set(answeredQuestions.map((a) => a.questionId));
    const unansweredRequired = requiredQuestionIds.filter(
      (id) => !answeredIds.has(id)
    );

    if (unansweredRequired.length > 0) {
      return {
        success: false,
        error: `Please answer all required questions. ${unansweredRequired.length} required question(s) remaining.`,
      };
    }

    // Submit the questionnaire
    const updated = await prisma.projectQuestionnaire.update({
      where: { id: projectQuestionnaireId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/questionnaire");
    revalidatePath(`/admin/projects/${pq.projectId}`);

    return { success: true, data: { id: updated.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to submit questionnaire",
    };
  }
}

/**
 * Get questionnaire completion progress
 */
export async function getQuestionnaireProgress(projectQuestionnaireId: string) {
  const session = await requireAuthSession();
  const userId = session.user.id;
  const userRole = session.user.role;

  if (!(userId && userRole)) {
    return null;
  }

  await verifyQuestionnaireAccess(projectQuestionnaireId, userId, userRole);

  const pq = await prisma.projectQuestionnaire.findUnique({
    where: { id: projectQuestionnaireId },
    include: {
      template: {
        include: {
          questions: {
            select: { id: true, required: true },
          },
        },
      },
      answers: {
        select: { questionId: true },
      },
    },
  });

  if (!pq) {
    return null;
  }

  const totalQuestions = pq.template.questions.length;
  const requiredQuestions = pq.template.questions.filter(
    (q) => q.required
  ).length;
  const answeredQuestions = pq.answers.length;

  const answeredIds = new Set(pq.answers.map((a) => a.questionId));
  const answeredRequired = pq.template.questions.filter(
    (q) => q.required && answeredIds.has(q.id)
  ).length;

  return {
    status: pq.status,
    totalQuestions,
    requiredQuestions,
    answeredQuestions,
    answeredRequired,
    percentComplete:
      totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0,
    canSubmit: answeredRequired === requiredQuestions,
  };
}
