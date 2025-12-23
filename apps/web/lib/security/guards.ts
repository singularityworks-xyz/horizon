import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { validateUserHasTenantAccess } from './tenant';

// SECURITY: Session-validated user context - NEVER trust client headers for auth
export type AuthenticatedContext = {
  userId: string;
  role: 'CLIENT' | 'ADMIN';
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
};

export type GuardedHandler<T = AuthenticatedContext> = (
  request: NextRequest,
  context: T,
  params: any
) => Promise<NextResponse> | NextResponse;

export interface GuardOptions {
  requiredRoles?: ('CLIENT' | 'ADMIN')[];
}

// Standard API error responses
export const apiErrors = {
  unauthorized: (message = 'Authentication required') =>
    NextResponse.json({ error: 'Unauthorized', message, code: 'UNAUTHORIZED' }, { status: 401 }),

  forbidden: (message = 'Access denied', code = 'FORBIDDEN') =>
    NextResponse.json({ error: 'Forbidden', message, code }, { status: 403 }),

  badRequest: (message = 'Bad request') =>
    NextResponse.json({ error: 'Bad Request', message, code: 'BAD_REQUEST' }, { status: 400 }),

  internalError: (message = 'Internal server error') =>
    NextResponse.json(
      { error: 'Internal Server Error', message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    ),

  notFound: (message = 'Resource not found') =>
    NextResponse.json({ error: 'Not Found', message, code: 'NOT_FOUND' }, { status: 404 }),
};

/**
 * SECURITY: Session-based authentication guard
 *
 * This function validates authentication through Better Auth session cookies,
 * NOT client headers. Headers can be forged - sessions cannot.
 *
 * Flow:
 * 1. Validate session cookie via Better Auth
 * 2. Fetch user data from database using session.user.id
 * 3. Validate tenant access through database relationships
 * 4. Verify role requirements
 * 5. Return validated context or throw 401/403
 */
export function withAuthGuard<T = AuthenticatedContext>(
  handler: GuardedHandler<T>,
  options: GuardOptions = {}
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<any> | any }
  ): Promise<NextResponse> => {
    try {
      // STEP 1: Validate session from cookie (NOT headers)
      const session = await auth.api.getSession({
        headers: Object.fromEntries(request.headers.entries()),
      });

      if (!session?.user) {
        console.warn('Authentication failed: No valid session');
        return apiErrors.unauthorized('Authentication required');
      }

      // STEP 2: Validate tenant access from database
      let tenantContext;
      try {
        tenantContext = await validateUserHasTenantAccess(session.user.id);
      } catch (error) {
        console.error('Tenant access validation failed:', error);
        return apiErrors.forbidden('No tenant access or tenant not found');
      }

      // STEP 3: Check role requirements
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        const userRole = tenantContext.role.toUpperCase() as 'CLIENT' | 'ADMIN';
        if (!options.requiredRoles.includes(userRole)) {
          console.warn(
            `Role check failed: Required ${options.requiredRoles.join(', ')}, got ${userRole}`
          );
          return apiErrors.forbidden(
            `Access denied. Required roles: ${options.requiredRoles.join(', ')}`,
            'INSUFFICIENT_ROLE'
          );
        }
      }

      // STEP 4: Build validated context
      const context = {
        userId: session.user.id,
        role: tenantContext.role.toUpperCase() as 'CLIENT' | 'ADMIN',
        tenantId: tenantContext.tenantId,
        tenant: tenantContext.tenant,
        session: {
          id: session.session.id,
          expiresAt: new Date(session.session.expiresAt),
        },
      } as T;

      // Ensure params is resolved (Next.js 15+ requirement)
      const resolvedParams = params instanceof Promise ? await params : params;

      // STEP 5: Execute handler with validated context
      return await handler(request, context, resolvedParams);
    } catch (error) {
      console.error('API guard error:', error);
      return apiErrors.internalError('An unexpected error occurred');
    }
  };
}

// Convenience guards for common patterns
export const guards = {
  /**
   * Admin-only access
   * Validates session and requires ADMIN role
   */
  adminOnly: <T extends AuthenticatedContext>(handler: GuardedHandler<T>) =>
    withAuthGuard(handler, { requiredRoles: ['ADMIN'] }),

  /**
   * Client access (admins can also access client routes)
   * Validates session and requires CLIENT or ADMIN role
   */
  clientAccess: <T extends AuthenticatedContext>(handler: GuardedHandler<T>) =>
    withAuthGuard(handler, { requiredRoles: ['CLIENT', 'ADMIN'] }),

  /**
   * Authenticated access (any role)
   * Validates session but allows any role
   */
  authenticated: <T extends AuthenticatedContext>(handler: GuardedHandler<T>) =>
    withAuthGuard(handler),
};

// Helper to create tenant-scoped database queries
export function createTenantScopedQuery(tenantId: string) {
  return {
    where: { tenantId },
  };
}

// Helper to ensure all database operations are tenant-scoped
export function enforceTenantScope(tenantId: string, query: any) {
  if (!query.where) {
    query.where = {};
  }
  query.where.tenantId = tenantId;
  return query;
}
