import { prisma } from '@horizon/db';
import { headers } from 'next/headers';
import { authServer } from './auth-server';

// Simplified role definitions
export type UserRole = 'CLIENT' | 'ADMIN';

// Simplified context - proxy injects this via headers
export interface UserContext {
  userId: string;
  role: UserRole;
  tenantId: string;
}

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

// Simplified RBAC helper functions
export const rbac = {
  // Get user context from headers (injected by proxy)
  getUserContext: async (): Promise<UserContext | null> => {
    try {
      const headersList = await headers();
      const userId = headersList.get('x-user-id');
      const userRole = headersList.get('x-user-role') as UserRole;
      const tenantId = headersList.get('x-tenant-id');

      if (!userId || !userRole || !tenantId) {
        return null;
      }

      return { userId, role: userRole, tenantId };
    } catch (error) {
      return null;
    }
  },

  // Require authentication and return user context
  requireAuth: async (): Promise<UserContext> => {
    const context = await rbac.getUserContext();
    if (!context) {
      throw new RBACError('Authentication required', 'AUTH_FAILED');
    }
    return context;
  },

  // Require specific roles
  requireRole: async (allowedRoles: UserRole[]): Promise<UserContext> => {
    const context = await rbac.requireAuth();

    if (!allowedRoles.includes(context.role)) {
      throw new RBACError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${context.role}`,
        'INSUFFICIENT_ROLE'
      );
    }

    return context;
  },

  // Require admin role specifically
  requireAdmin: async (): Promise<UserContext> => {
    return rbac.requireRole(['ADMIN']);
  },

  // Require client role specifically
  requireClient: async (): Promise<UserContext> => {
    return rbac.requireRole(['CLIENT']);
  },

  // Check if user has specific role (doesn't throw)
  hasRole: async (role: UserRole): Promise<boolean> => {
    try {
      const context = await rbac.requireAuth();
      return context.role === role;
    } catch {
      return false;
    }
  },

  // Check if user is admin
  isAdmin: async (): Promise<boolean> => {
    return rbac.hasRole('ADMIN');
  },

  // Check if user is client
  isClient: async (): Promise<boolean> => {
    return rbac.hasRole('CLIENT');
  },
};

// Type guards for role checking
export const roleGuards = {
  isAdmin: (role: UserRole): role is 'ADMIN' => role === 'ADMIN',
  isClient: (role: UserRole): role is 'CLIENT' => role === 'CLIENT',
};
