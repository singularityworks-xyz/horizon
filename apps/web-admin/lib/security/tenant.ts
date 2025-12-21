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
    // For now, we'll use a simplified approach
    // TODO: Replace with real user-tenant-role mapping from database
    // This is a placeholder until we implement proper user management

    // Check if tenant exists
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!tenant) {
      throw new TenantValidationError(`Tenant ${tenantId} not found`, 'TENANT_NOT_FOUND');
    }

    // TODO: Check if user belongs to this tenant
    // For now, we'll allow any authenticated user access to any tenant
    // This will be replaced with proper user-tenant-role validation

    return {
      tenantId,
      userId,
      role: 'admin', // Default to admin for now
      tenant,
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
    const userWithTenant = await prisma.users.findFirst({
      where: { id: userId },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        roles: {
          select: {
            name: true,
          },
        },
      },
    });

    // If user not found in users table, they haven't been linked to a tenant yet
    if (!userWithTenant || !userWithTenant.tenants) {
      throw new TenantValidationError(
        `User ${userId} is not linked to any tenant`,
        'USER_NOT_LINKED'
      );
    }

    // Determine role from the roles table
    const role = (userWithTenant.roles?.name === 'admin' ? 'admin' : 'client') as
      | 'admin'
      | 'client';

    return {
      tenantId: userWithTenant.tenants.id,
      userId,
      role,
      tenant: {
        id: userWithTenant.tenants.id,
        name: userWithTenant.tenants.name,
        slug: userWithTenant.tenants.slug,
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
