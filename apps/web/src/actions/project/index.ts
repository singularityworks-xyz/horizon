"use server";

import { auth } from "@horizon/auth";
import prisma, { type ProjectStatus, type ProjectType } from "@horizon/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ============================================================================
// Types
// ============================================================================

export type ProjectWithClient = Awaited<ReturnType<typeof getProjectById>>;

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// Helpers
// ============================================================================

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

async function requireAuthSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireAdminSession() {
  const session = await requireAuthSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }
  return session;
}

// ============================================================================
// Project Actions
// ============================================================================

/**
 * Create a new project for a client (Admin only)
 */
export async function createProject(data: {
  name: string;
  clientId: string;
  type: ProjectType;
  status?: ProjectStatus;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    const project = await prisma.project.create({
      data: {
        name: data.name,
        clientId: data.clientId,
        type: data.type,
        status: data.status ?? "ACTIVE",
      },
    });

    revalidatePath("/admin/projects");
    revalidatePath("/admin/clients");

    return { success: true, data: { id: project.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

/**
 * Get a single project by ID
 * Admin can view any project, Client can only view their own
 */
export async function getProjectById(projectId: string) {
  const session = await requireAuthSession();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      questionnaires: {
        include: {
          template: {
            include: {
              questions: {
                select: { id: true },
              },
            },
          },
          answers: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  // Non-admin users can only view their own projects
  if (session.user.role !== "ADMIN" && project.clientId !== session.user.id) {
    throw new Error("Forbidden: You can only view your own projects");
  }

  return project;
}

/**
 * Get all projects for a specific client
 * Admin can view any client's projects, Client can only view their own
 */
export async function getProjectsByClient(clientId?: string) {
  const session = await requireAuthSession();

  // Non-admin users can only view their own projects
  const targetClientId =
    session.user.role === "ADMIN" ? clientId : session.user.id;

  if (!targetClientId) {
    throw new Error("Client ID is required");
  }

  // Prevent non-admin users from viewing other users' projects
  if (
    session.user.role !== "ADMIN" &&
    clientId &&
    clientId !== session.user.id
  ) {
    throw new Error("Forbidden: You can only view your own projects");
  }

  const projects = await prisma.project.findMany({
    where: { clientId: targetClientId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      questionnaires: {
        select: {
          id: true,
          status: true,
          template: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              answers: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects;
}

/**
 * Get all projects with pagination (Admin only)
 */
export async function getAllProjects(options?: {
  cursor?: string;
  take?: number;
  status?: ProjectStatus;
  type?: ProjectType;
}) {
  await requireAdminSession();

  const take = options?.take ?? 20;

  const projects = await prisma.project.findMany({
    where: {
      ...(options?.status && { status: options.status }),
      ...(options?.type && { type: options.type }),
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      questionnaires: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: take + 1, // Fetch one extra to check if there are more
    ...(options?.cursor && {
      cursor: { id: options.cursor },
      skip: 1,
    }),
  });

  const hasMore = projects.length > take;
  const data = hasMore ? projects.slice(0, -1) : projects;
  const nextCursor = hasMore ? data.at(-1)?.id : undefined;

  return {
    projects: data,
    nextCursor,
    hasMore,
  };
}

/**
 * Update a project (Admin only)
 */
export async function updateProject(
  projectId: string,
  data: {
    name?: string;
    status?: ProjectStatus;
    type?: ProjectType;
  }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    revalidatePath("/admin/projects");
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath("/dashboard/projects");

    return { success: true, data: { id: project.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update project",
    };
  }
}

/**
 * Delete a project (Admin only)
 * This will cascade delete all related questionnaires and answers
 */
export async function deleteProject(
  projectId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminSession();

    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath("/admin/projects");
    revalidatePath("/admin/clients");

    return { success: true, data: { id: projectId } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}
