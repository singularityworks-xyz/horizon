import { prisma } from '@horizon/db';

// Tenant validation types
export interface TenantAccess {
  tenantId: string;
  userId: string;
  role: 'admin' | 'client';
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

// Tenant validation errors
export class TenantValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'TenantValidationError';
  }
}

// Validate that a user has access to a specific tenant
export async function validateTenantAccess(
  userId: string,
  tenantId: string
): Promise<TenantAccess> {
  try {
    // Query the users table to verify this user belongs to this tenant
    // The users table links user → tenant → role
    let userWithTenant = await prisma.users.findFirst({
      where: {
        id: userId,
        tenantId: tenantId,
      },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        userRoles: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // FALLBACK: If not found by ID, try searching by email (useful for seed data mismatches)
    if (!userWithTenant) {
      const betterAuthUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (betterAuthUser?.email) {
        userWithTenant = await prisma.users.findFirst({
          where: {
            email: betterAuthUser.email,
            tenantId: tenantId,
          },
          include: {
            tenants: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            userRoles: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }
    }

    // If no record found, user does not have access to this tenant
    if (!userWithTenant || !(userWithTenant as any).tenants) {
      throw new TenantValidationError(`User does not have access to tenant`, 'NO_ACCESS');
    }

    // Determine role from both the 'role' field and the 'userRoles' relation
    const directRole = (userWithTenant as any).role?.toUpperCase();
    const userRoles = (userWithTenant as any).userRoles || [];

    const hasAdminRole =
      directRole === 'ADMIN' || userRoles.some((r: any) => r.name?.toLowerCase() === 'admin');

    const role = hasAdminRole ? 'admin' : 'client';

    return {
      tenantId: (userWithTenant as any).tenants.id,
      userId,
      role,
      tenant: {
        id: (userWithTenant as any).tenants.id,
        name: (userWithTenant as any).tenants.name,
        slug: (userWithTenant as any).tenants.slug,
      },
    };
  } catch (error) {
    if (error instanceof TenantValidationError) {
      throw error;
    }
    throw new TenantValidationError(
      `Failed to validate tenant access: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'TENANT_VALIDATION_FAILED'
    );
  }
}

// Check if a user has access to any tenant (used for general auth checks)
export async function validateUserHasTenantAccess(userId: string): Promise<TenantAccess> {
  try {
    // Look up the user's tenant and role from the database
    let userWithTenant = await prisma.users.findFirst({
      where: { id: userId },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        userRoles: {
          select: {
            name: true,
          },
        },
      },
    });

    // FALLBACK: If not found by ID, try searching by email (useful for seed data vs Better Auth ID mismatches)
    if (!userWithTenant) {
      // Get user email from the session-identified user
      const betterAuthUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (betterAuthUser?.email) {
        userWithTenant = await prisma.users.findFirst({
          where: { email: betterAuthUser.email },
          include: {
            tenants: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            userRoles: {
              select: {
                name: true,
              },
            },
          },
        });
      }
    }

    // If user not found in users table, they haven't been linked to a tenant yet
    if (!userWithTenant || !(userWithTenant as any).tenants) {
      console.warn(`User ${userId} found in session but missing from app users/tenants table`);
      throw new TenantValidationError(
        `User ${userId} is not linked to any tenant in the app database`,
        'USER_NOT_LINKED'
      );
    }

    // Determine role from both the 'role' field and the 'userRoles' relation
    const directRole = (userWithTenant as any).role?.toUpperCase();
    const userRoles = (userWithTenant as any).userRoles || [];

    const hasAdminRole =
      directRole === 'ADMIN' || userRoles.some((r: any) => r.name?.toLowerCase() === 'admin');

    const role = hasAdminRole ? 'admin' : 'client';

    return {
      tenantId: (userWithTenant as any).tenants.id,
      userId,
      role,
      tenant: {
        id: (userWithTenant as any).tenants.id,
        name: (userWithTenant as any).tenants.name,
        slug: (userWithTenant as any).tenants.slug,
      },
    };
  } catch (error) {
    if (error instanceof TenantValidationError) {
      throw error;
    }
    throw new TenantValidationError(
      `Failed to validate user tenant access: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'USER_TENANT_ACCESS_FAILED'
    );
  }
}

// Assert that a user can access a specific tenant (throws on failure)
export async function assertTenantAccess(userId: string, tenantId: string): Promise<TenantAccess> {
  return await validateTenantAccess(userId, tenantId);
}
