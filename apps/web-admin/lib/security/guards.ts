import { NextRequest, NextResponse } from "next/server"
import { rbac, UserRole, TenantContext, RBACError } from "../auth-rbac"

// API guard types
export type GuardedHandler = (
  request: NextRequest,
  context: TenantContext
) => Promise<NextResponse> | NextResponse

export interface GuardOptions {
  requiredRoles?: UserRole[]
  tenantId?: string // If specified, validate access to this specific tenant
}

// Standard API error responses
export const apiErrors = {
  unauthorized: (message = "Authentication required") =>
    NextResponse.json(
      { error: "Unauthorized", message, code: "UNAUTHORIZED" },
      { status: 401 }
    ),

  forbidden: (message = "Access denied", code = "FORBIDDEN") =>
    NextResponse.json(
      { error: "Forbidden", message, code },
      { status: 403 }
    ),

  badRequest: (message = "Bad request") =>
    NextResponse.json(
      { error: "Bad Request", message, code: "BAD_REQUEST" },
      { status: 400 }
    ),

  internalError: (message = "Internal server error") =>
    NextResponse.json(
      { error: "Internal Server Error", message, code: "INTERNAL_ERROR" },
      { status: 500 }
    ),
}

// API guard wrapper - enforces auth + tenant + role before handler execution
export function withAuthGuard(
  handler: GuardedHandler,
  options: GuardOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Step 1: Authenticate user (session validation)
      let context: TenantContext
      try {
        context = await rbac.requireAuth()
      } catch (error) {
        console.error("Authentication failed:", error)
        return apiErrors.unauthorized("Authentication required")
      }

      // Step 2: Validate tenant access if specific tenant required
      if (options.tenantId) {
        try {
          context = await rbac.validateTenantAccess(context.userId, options.tenantId)
        } catch (error) {
          console.error("Tenant access validation failed:", error)
          return apiErrors.forbidden("Access denied to requested tenant")
        }
      }

      // Step 3: Check role requirements
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        try {
          await rbac.requireRole(options.requiredRoles)
        } catch (error) {
          if (error instanceof RBACError) {
            console.error("Role validation failed:", error.message)
            return apiErrors.forbidden(error.message, error.code)
          }
          return apiErrors.forbidden("Insufficient permissions")
        }
      }

      // Step 4: Execute the handler with validated context
      return await handler(request, context)

    } catch (error) {
      console.error("API guard error:", error)

      // Handle known RBAC errors
      if (error instanceof RBACError) {
        return apiErrors.forbidden(error.message, error.code)
      }

      // Handle other errors
      return apiErrors.internalError("An unexpected error occurred")
    }
  }
}

// Convenience guards for common patterns
export const guards = {
  // Admin-only access
  adminOnly: (handler: GuardedHandler) =>
    withAuthGuard(handler, { requiredRoles: ["admin"] }),

  // Client-only access
  clientOnly: (handler: GuardedHandler) =>
    withAuthGuard(handler, { requiredRoles: ["client"] }),

  // Authenticated access (any role)
  authenticated: (handler: GuardedHandler) =>
    withAuthGuard(handler),

  // Admin access to specific tenant
  adminForTenant: (tenantId: string) => (handler: GuardedHandler) =>
    withAuthGuard(handler, { requiredRoles: ["admin"], tenantId }),

  // Client access to specific tenant
  clientForTenant: (tenantId: string) => (handler: GuardedHandler) =>
    withAuthGuard(handler, { requiredRoles: ["client"], tenantId }),
}

// Helper to create tenant-scoped database queries
export function createTenantScopedQuery(tenantId: string) {
  return {
    where: { tenantId },
  }
}

// Helper to ensure all database operations are tenant-scoped
export function enforceTenantScope(tenantId: string, query: any) {
  if (!query.where) {
    query.where = {}
  }
  query.where.tenantId = tenantId
  return query
}
