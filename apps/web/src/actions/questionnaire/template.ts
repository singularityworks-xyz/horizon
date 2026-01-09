"use server";

import { auth } from "@horizon/auth";
import prisma, { type Prisma, type ProjectType } from "@horizon/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ============================================================================
// Types
// ============================================================================

export type TemplateWithQuestions = Awaited<ReturnType<typeof getTemplateById>>;

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
// Template Actions
// ============================================================================

/**
 * Create a new questionnaire template (Admin only)
 */
export async function createTemplate(data: {
  name: string;
  description?: string;
  projectType: ProjectType;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    const template = await prisma.questionnaireTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        projectType: data.projectType,
        isActive: true,
        version: 1,
      },
    });

    revalidatePath("/admin/questionnaire");

    return { success: true, data: { id: template.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create template",
    };
  }
}

/**
 * Get a template by ID with all its questions
 */
export async function getTemplateById(templateId: string) {
  await requireAuthSession();

  const template = await prisma.questionnaireTemplate.findUnique({
    where: { id: templateId },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  return template;
}

/**
 * Get templates by project type (Admin only)
 */
export async function getTemplatesByType(
  projectType: ProjectType,
  activeOnly = true
) {
  await requireAdminSession();

  const templates = await prisma.questionnaireTemplate.findMany({
    where: {
      projectType,
      ...(activeOnly && { isActive: true }),
    },
    include: {
      questions: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return templates.map((t) => ({
    ...t,
    questionCount: t.questions.length,
    questions: undefined,
  }));
}

/**
 * Get all templates with pagination (Admin only)
 */
export async function getAllTemplates(options?: {
  cursor?: string;
  take?: number;
  activeOnly?: boolean;
  projectType?: ProjectType;
}) {
  await requireAdminSession();

  const take = options?.take ?? 20;

  const templates = await prisma.questionnaireTemplate.findMany({
    where: {
      ...(options?.activeOnly !== false && { isActive: true }),
      ...(options?.projectType && { projectType: options.projectType }),
    },
    include: {
      questions: {
        select: { id: true },
      },
      _count: {
        select: { projectQuestionnaires: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(options?.cursor && {
      cursor: { id: options.cursor },
      skip: 1,
    }),
  });

  const hasMore = templates.length > take;
  const data = hasMore ? templates.slice(0, -1) : templates;
  const nextCursor = hasMore ? data.at(-1)?.id : undefined;

  return {
    templates: data.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      projectType: t.projectType,
      version: t.version,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      questionCount: t.questions.length,
      usageCount: t._count.projectQuestionnaires,
    })),
    nextCursor,
    hasMore,
  };
}

/**
 * Update a template (Admin only)
 */
export async function updateTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    projectType?: ProjectType;
    isActive?: boolean;
  }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    const template = await prisma.questionnaireTemplate.update({
      where: { id: templateId },
      data,
    });

    revalidatePath("/admin/questionnaire");
    revalidatePath(`/admin/questionnaire/${templateId}`);

    return { success: true, data: { id: template.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update template",
    };
  }
}

/**
 * Delete a template (Admin only)
 * This will cascade delete all questions and answers
 */
export async function deleteTemplate(
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    // Check if template is being used in any projects
    const usageCount = await prisma.projectQuestionnaire.count({
      where: { templateId },
    });

    if (usageCount > 0) {
      return {
        success: false,
        error: `Cannot delete: Template is used in ${usageCount} project(s). Deactivate instead.`,
      };
    }

    await prisma.questionnaireTemplate.delete({
      where: { id: templateId },
    });

    revalidatePath("/admin/questionnaire");

    return { success: true, data: { id: templateId } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete template",
    };
  }
}

/**
 * Duplicate a template with new version (Admin only)
 */
export async function duplicateTemplate(
  templateId: string,
  newName?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    const original = await prisma.questionnaireTemplate.findUnique({
      where: { id: templateId },
      include: {
        questions: true,
      },
    });

    if (!original) {
      return { success: false, error: "Template not found" };
    }

    // Get the highest version for this template name
    const latestVersion = await prisma.questionnaireTemplate.findFirst({
      where: {
        name: { startsWith: original.name },
        projectType: original.projectType,
      },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const newVersion = (latestVersion?.version ?? 0) + 1;

    // Create new template with all questions
    const newTemplate = await prisma.questionnaireTemplate.create({
      data: {
        name: newName ?? `${original.name} v${newVersion}`,
        description: original.description,
        projectType: original.projectType,
        version: newVersion,
        isActive: true,
        questions: {
          create: original.questions.map((q) => ({
            label: q.label,
            type: q.type,
            required: q.required,
            order: q.order,
            options: q.options as Prisma.InputJsonValue | undefined,
          })),
        },
      },
    });

    revalidatePath("/admin/questionnaire");

    return { success: true, data: { id: newTemplate.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to duplicate template",
    };
  }
}
