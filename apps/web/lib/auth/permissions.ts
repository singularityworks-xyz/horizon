import { prisma } from '@horizon/db';
import { TenantAccess } from '../security/tenant';

// Defined permissions
export type Permission =
  | 'users:read'
  | 'users:write'
  | 'tenants:read'
  | 'tenants:write'
  | 'settings:write'
  | 'projects:read'
  | 'projects:write'
  | 'workflows:read'
  | 'workflows:write';

// Role to permissions mapping
// Since we don't have this in the DB schema yet, we define it here
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'users:read',
    'users:write',
    'tenants:read',
    'tenants:write',
    'settings:write',
    'projects:read',
    'projects:write',
    'workflows:read',
    'workflows:write',
  ],
  client: ['projects:read', 'projects:write', 'workflows:read'],
  viewer: ['projects:read', 'workflows:read'],
};

// Check if user has a specific permission
export async function userHasPermission(
  userId: string,
  tenantId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const role = await getUserTenantRole(userId, tenantId);
    if (!role) return false;

    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission) || role === 'admin';
  } catch (error) {
    return false;
  }
}

// Require a permission (throws error if missing)
export async function requirePermission(
  userId: string,
  tenantId: string,
  permission: Permission
): Promise<void> {
  const hasAccess = await userHasPermission(userId, tenantId, permission);
  if (!hasAccess) {
    throw new Error(`Missing required permission: ${permission}`);
  }
}

// Helper to get user's role for a tenant
export async function getUserTenantRole(userId: string, tenantId: string): Promise<string | null> {
  const user = await prisma.users.findFirst({
    where: {
      id: userId,
      tenantId: tenantId,
    },
    include: {
      userRoles: true,
    },
  });

  const userRoles = (user as any)?.userRoles || [];
  return userRoles[0]?.name || null;
}
