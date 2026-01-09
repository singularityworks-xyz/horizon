"use server";

import { auth } from "@horizon/auth";
import prisma, { Prisma, type QuestionType } from "@horizon/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ============================================================================
// Types
// ============================================================================

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface QuestionInput {
  label: string;
  type: QuestionType;
  required?: boolean;
  order?: number;
  options?: Prisma.InputJsonValue | null;
}

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
// Question Actions
// ============================================================================

/**
 * Add a question to a template (Admin only)
 */
export async function addQuestion(
  templateId: string,
  data: QuestionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    // Get the highest order for this template
    const lastQuestion = await prisma.question.findFirst({
      where: { templateId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = data.order ?? (lastQuestion?.order ?? 0) + 1;

    const question = await prisma.question.create({
      data: {
        templateId,
        label: data.label,
        type: data.type,
        required: data.required ?? false,
        order: nextOrder,
        options: data.options ?? Prisma.JsonNull,
      },
    });

    revalidatePath(`/admin/questionnaire/${templateId}`);

    return { success: true, data: { id: question.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add question",
    };
  }
}

/**
 * Update a question (Admin only)
 */
export async function updateQuestion(
  questionId: string,
  data: Partial<QuestionInput>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    const updateData: Prisma.QuestionUpdateInput = {};

    if (data.label !== undefined) {
      updateData.label = data.label;
    }
    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.required !== undefined) {
      updateData.required = data.required;
    }
    if (data.order !== undefined) {
      updateData.order = data.order;
    }
    if (data.options !== undefined) {
      updateData.options =
        data.options === null ? Prisma.JsonNull : data.options;
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
    });

    revalidatePath(`/admin/questionnaire/${question.templateId}`);

    return { success: true, data: { id: question.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update question",
    };
  }
}

/**
 * Delete a question (Admin only)
 */
export async function deleteQuestion(
  questionId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    const question = await prisma.question.delete({
      where: { id: questionId },
    });

    revalidatePath(`/admin/questionnaire/${question.templateId}`);

    return { success: true, data: { id: questionId } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete question",
    };
  }
}

/**
 * Reorder questions in a template (Admin only)
 */
export async function reorderQuestions(
  templateId: string,
  questionIds: string[]
): Promise<ActionResult<{ count: number }>> {
  try {
    await requireAdminSession();

    // Update all questions with their new order
    const updates = questionIds.map((id, index) =>
      prisma.question.update({
        where: { id },
        data: { order: index + 1 },
      })
    );

    await prisma.$transaction(updates);

    revalidatePath(`/admin/questionnaire/${templateId}`);

    return { success: true, data: { count: questionIds.length } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reorder questions",
    };
  }
}

/**
 * Get all questions for a template (ordered)
 */
export async function getQuestionsByTemplate(templateId: string) {
  await requireAuthSession();

  const questions = await prisma.question.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
  });

  return questions;
}

/**
 * Bulk add questions to a template (Admin only)
 */
export async function addBulkQuestions(
  templateId: string,
  questions: QuestionInput[]
): Promise<ActionResult<{ count: number }>> {
  try {
    await requireAdminSession();

    // Get the highest order for this template
    const lastQuestion = await prisma.question.findFirst({
      where: { templateId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    let currentOrder = (lastQuestion?.order ?? 0) + 1;

    const result = await prisma.question.createMany({
      data: questions.map((q) => ({
        templateId,
        label: q.label,
        type: q.type,
        required: q.required ?? false,
        order: q.order ?? currentOrder++,
        options: q.options ?? Prisma.JsonNull,
      })),
    });

    revalidatePath(`/admin/questionnaire/${templateId}`);

    return { success: true, data: { count: result.count } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add questions",
    };
  }
}
