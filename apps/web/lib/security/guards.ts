import { type NextRequest, NextResponse } from 'next/server';

// Simplified guard types (proxy handles auth)
export type GuardedHandler<T = { userId: string; role: 'CLIENT' | 'ADMIN'; tenantId: string }> = (
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

// Simplified guard wrapper - proxy injects user context via headers
export function withAuthGuard<T = { userId: string; role: 'CLIENT' | 'ADMIN'; tenantId: string }>(
  handler: GuardedHandler<T>,
  options: GuardOptions = {}
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<any> | any }
  ): Promise<NextResponse> => {
    try {
      // Get user context from headers (injected by proxy)
      const userId = request.headers.get('x-user-id');
      const userRole = (request.headers.get('x-user-role') as 'CLIENT' | 'ADMIN') || 'CLIENT';
      const tenantId = request.headers.get('x-tenant-id');

      if (!userId || !userRole || !tenantId) {
        return apiErrors.unauthorized('Authentication required');
      }

      // Check role requirements
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        if (!options.requiredRoles.includes(userRole)) {
          return apiErrors.forbidden(
            `Access denied. Required roles: ${options.requiredRoles.join(', ')}. Your role: ${userRole}`,
            'INSUFFICIENT_ROLE'
          );
        }
      }

      const context = { userId, role: userRole, tenantId } as T;

      // Ensure params is resolved (Next.js 15+ requirement)
      const resolvedParams = params instanceof Promise ? await params : params;

      // Execute the handler with validated context and params
      return await handler(request, context, resolvedParams);
    } catch (error) {
      console.error('API guard error:', error);
      return apiErrors.internalError('An unexpected error occurred');
    }
  };
}

// Convenience guards for common patterns
export const guards = {
  // Admin-only access
  adminOnly: <T extends { userId: string; role: 'ADMIN'; tenantId: string }>(
    handler: GuardedHandler<T>
  ) => withAuthGuard(handler, { requiredRoles: ['ADMIN'] }),

  // Client access (admin can also access client routes)
  clientAccess: <T extends { userId: string; role: 'CLIENT' | 'ADMIN'; tenantId: string }>(
    handler: GuardedHandler<T>
  ) => withAuthGuard(handler, { requiredRoles: ['CLIENT', 'ADMIN'] }),

  // Authenticated access (any role)
  authenticated: <T extends { userId: string; role: 'CLIENT' | 'ADMIN'; tenantId: string }>(
    handler: GuardedHandler<T>
  ) => withAuthGuard(handler),
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
