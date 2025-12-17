import { authServer } from "./auth-server"
import { headers } from "next/headers"

// Role definitions
export type UserRole = "admin" | "client"

export interface TenantContext {
  tenantId: string
  userId: string
  role: UserRole
}

// RBAC helper functions
export const rbac = {
  // Get tenant context from request headers (set by middleware)
  getTenantContext: async (): Promise<TenantContext | null> => {
    try {
      const headersList = await headers()
      const tenantId = headersList.get("x-tenant-id")
      const userId = headersList.get("x-user-id")
      const role = headersList.get("x-user-role") as UserRole

      if (!tenantId || !userId || !role) {
        return null
      }

      return { tenantId, userId, role }
    } catch (error) {
      return null
    }
  },

  // Require authentication and return tenant context
  requireAuth: async (): Promise<TenantContext> => {
    // First check session
    const session = await authServer.requireSession()

    // Then get tenant context
    const tenantContext = await rbac.getTenantContext()
    if (!tenantContext) {
      throw new Error("Tenant context not found. Please ensure you're accessing from an authenticated route.")
    }

    return tenantContext
  },

  // Require specific roles
  requireRole: async (allowedRoles: UserRole[]): Promise<TenantContext> => {
    const tenantContext = await rbac.requireAuth()

    if (!allowedRoles.includes(tenantContext.role)) {
      throw new Error(`Access denied. Required roles: ${allowedRoles.join(", ")}. Your role: ${tenantContext.role}`)
    }

    return tenantContext
  },

  // Require admin role specifically
  requireAdmin: async (): Promise<TenantContext> => {
    return rbac.requireRole(["admin"])
  },

  // Require client role specifically
  requireClient: async (): Promise<TenantContext> => {
    return rbac.requireRole(["client"])
  },

  // Check if user has specific role (doesn't throw)
  hasRole: async (role: UserRole): Promise<boolean> => {
    try {
      const tenantContext = await rbac.getTenantContext()
      return tenantContext?.role === role || false
    } catch {
      return false
    }
  },

  // Check if user is admin
  isAdmin: async (): Promise<boolean> => {
    return rbac.hasRole("admin")
  },

  // Check if user is client
  isClient: async (): Promise<boolean> => {
    return rbac.hasRole("client")
  },
}

// Type guards for role checking
export const roleGuards = {
  isAdmin: (role: UserRole): role is "admin" => role === "admin",
  isClient: (role: UserRole): role is "client" => role === "client",
}
