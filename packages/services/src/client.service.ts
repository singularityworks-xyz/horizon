import prisma from "@horizon/db";

/**
 * Fetch clients with pagination and optional search
 * Reusable across tRPC, REST APIs, background jobs, etc.
 */
export async function fetchClients(params: {
  limit: number;
  cursor?: string;
  search?: string;
}) {
  const { limit, cursor, search } = params;

  const where = {
    role: "USER" as const,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const clients = await prisma.user.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sessions: true,
          accounts: true,
        },
      },
    },
  });

  let nextCursor: string | undefined;
  if (clients.length > limit) {
    const nextItem = clients.pop();
    nextCursor = nextItem?.id;
  }

  return {
    clients,
    nextCursor,
  };
}

/**
 * Fetch a single client by ID with full details
 */
export async function fetchClientById(clientId: string) {
  const client = await prisma.user.findUnique({
    where: {
      id: clientId,
      role: "USER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      sessions: {
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          ipAddress: true,
          userAgent: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      accounts: {
        select: {
          id: true,
          providerId: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          sessions: true,
          accounts: true,
        },
      },
    },
  });

  return client;
}

/**
 * Fetch client statistics for admin dashboard
 */
export async function fetchClientStats() {
  const [totalClients, activeClients, verifiedClients] = await Promise.all([
    prisma.user.count({
      where: { role: "USER" },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        sessions: {
          some: {
            expiresAt: {
              gt: new Date(),
            },
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        emailVerified: true,
      },
    }),
  ]);

  return {
    totalClients,
    activeClients,
    verifiedClients,
    unverifiedClients: totalClients - verifiedClients,
  };
}
