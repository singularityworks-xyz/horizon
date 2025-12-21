import { authServer } from './auth-server';
import { headers } from 'next/headers';
import {
  validateTenantAccess,
  assertTenantAccess,
  validateUserHasTenantAccess,
  TenantAccess,
} from './security/tenant';

// Role definitions
export type UserRole = 'admin' | 'client';

// Enhanced tenant context with full validation
export interface TenantContext extends TenantAccess {}

// RBAC error types
export class RBACError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'RBACError';
  }
}

// RBAC helper functions
export const rbac = {
  // Get tenant context from request headers (set by middleware)
  // NOTE: Middleware only sets x-user-id for security.
  // This function is kept for compatibility but authoritative sources should use requireAuth()
  getTenantContext: async (): Promise<TenantContext | null> => {
    try {
      const headersList = await headers();
      const userId = headersList.get('x-user-id');

      if (!userId) {
        return null;
      }

      // If we have a user ID, we should validate their access from the database
      // This ensures we always have fresh, valid data
      try {
        return await validateUserHasTenantAccess(userId);
      } catch (error) {
        return null;
      }
    } catch (error) {
      return null;
    }
  },

  // Require authentication and return validated tenant context
  requireAuth: async (): Promise<TenantContext> => {
    // First check session
    const session = await authServer.requireSession();

    // Then validate tenant access (this is the authoritative check)
    try {
      return await validateUserHasTenantAccess(session.user.id);
    } catch (error) {
      throw new RBACError(
        `Authentication failed: ${error instanceof Error ? error.message : 'Tenant access validation failed'}`,
        'AUTH_FAILED'
      );
    }
  },

  // Require specific roles with tenant validation
  requireRole: async (allowedRoles: UserRole[]): Promise<TenantContext> => {
    const tenantContext = await rbac.requireAuth();

    if (!allowedRoles.includes(tenantContext.role)) {
      throw new RBACError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${tenantContext.role}`,
        'INSUFFICIENT_ROLE'
      );
    }

    return tenantContext;
  },

  // Require admin role specifically
  requireAdmin: async (): Promise<TenantContext> => {
    return rbac.requireRole(['admin']);
  },

  // Require client role specifically
  requireClient: async (): Promise<TenantContext> => {
    return rbac.requireRole(['client']);
  },

  // Check if user has specific role (doesn't throw)
  hasRole: async (role: UserRole): Promise<boolean> => {
    try {
      const tenantContext = await rbac.requireAuth();
      return tenantContext.role === role;
    } catch {
      return false;
    }
  },

  // Check if user is admin
  isAdmin: async (): Promise<boolean> => {
    return rbac.hasRole('admin');
  },

  // Check if user is client
  isClient: async (): Promise<boolean> => {
    return rbac.hasRole('client');
  },

  // Validate access to a specific tenant (authoritative check)
  validateTenantAccess: async (userId: string, tenantId: string): Promise<TenantContext> => {
    return await validateTenantAccess(userId, tenantId);
  },

  // Assert tenant access (throws on failure)
  assertTenantAccess: async (userId: string, tenantId: string): Promise<TenantContext> => {
    return await assertTenantAccess(userId, tenantId);
  },
};

// Type guards for role checking
export const roleGuards = {
  isAdmin: (role: UserRole): role is 'admin' => role === 'admin',
  isClient: (role: UserRole): role is 'client' => role === 'client',
};
