"use server";

import { auth } from "@horizon/auth";
import prisma from "@horizon/db";
import { headers } from "next/headers";

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

// ============================================================================
// Client Actions
// ============================================================================

/**
 * Search clients by name or email (Admin only)
 */
export async function searchClients(query?: string) {
  await requireAdminSession();

  const clients = await prisma.user.findMany({
    where: {
      role: "USER",
      ...(query && {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }),
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  return clients;
}

/**
 * Get all clients (Admin only)
 */
export async function getAllClients() {
  await requireAdminSession();

  const clients = await prisma.user.findMany({
    where: {
      role: "USER",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
  });

  return clients;
}
