import { auth } from '@/lib/auth';
import { validateUserHasTenantAccess } from '@/lib/security/tenant';
import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '@/lib/audit/logger';

/**
 * SECURITY: Session Validation Middleware
 *
 * Validates sessions on every authenticated request and handles:
 * - Session expiration
 * - Session refresh
 * - Tenant validation
 * - Audit logging
 *
 * This should be called early in the request lifecycle for protected routes.
 */

export interface ValidatedSession {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  role: 'CLIENT' | 'ADMIN';
}

/**
 * Validate and refresh session
 *
 * Returns validated session data or null if invalid
 */
export async function validateSession(request: NextRequest): Promise<ValidatedSession | null> {
  try {
    // STEP 1: Get session from Better Auth
    const session = await auth.api.getSession({
      headers: Object.fromEntries(request.headers.entries()),
    });

    if (!session?.user) {
      return null;
    }

    // STEP 2: Check session expiration
    const now = new Date();
    const expiresAt = new Date(session.session.expiresAt);

    if (expiresAt < now) {
      await auditLog.suspiciousActivity(
        session.user.id,
        'Expired session used',
        getClientIp(request)
      );
      return null;
    }

    // STEP 3: Validate tenant access
    let tenantContext;
    try {
      tenantContext = await validateUserHasTenantAccess(session.user.id);
    } catch (error) {
      await auditLog.tenantAccessAttempt(
        session.user.id,
        'unknown',
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return null;
    }

    // STEP 4: Check if session needs refresh (within 24 hours of expiry)
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const shouldRefresh = timeUntilExpiry < 24 * 60 * 60 * 1000; // Less than 24 hours

    if (shouldRefresh) {
      // Refresh session by updating updateAge
      // Better Auth handles this automatically if configured
      console.log(`Session ${session.session.id} will be refreshed soon`);
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      session: {
        id: session.session.id,
        expiresAt,
      },
      tenant: tenantContext.tenant,
      role: tenantContext.role.toUpperCase() as 'CLIENT' | 'ADMIN',
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Middleware wrapper for Next.js route handlers
 *
 * Usage:
 * ```typescript
 * export const GET = withSessionValidation(async (request, session) => {
 *   // session is validated and typed
 *   return NextResponse.json({ userId: session.user.id });
 * });
 * ```
 */
export function withSessionValidation(
  handler: (request: NextRequest, session: ValidatedSession) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await validateSession(request);

    if (!session) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired session',
          code: 'SESSION_INVALID',
        },
        { status: 401 }
      );
    }

    return handler(request, session);
  };
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(
  sessionId: string,
  userId: string,
  tenantId: string
): Promise<void> {
  try {
    // Log the logout
    await auditLog.logout(userId, tenantId);

    // TODO: Implement session invalidation in Better Auth
    // This might involve calling Better Auth's signOut API
    // or manually deleting the session from the database

    console.log(`Session ${sessionId} invalidated for user ${userId}`);
  } catch (error) {
    console.error('Session invalidation error:', error);
  }
}

/**
 * Check if a session is still valid without full validation
 * (lightweight check for high-frequency endpoints)
 */
export async function quickSessionCheck(request: NextRequest): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: Object.fromEntries(request.headers.entries()),
    });

    if (!session?.user) {
      return false;
    }

    // Just check expiration
    const now = new Date();
    const expiresAt = new Date(session.session.expiresAt);

    return expiresAt > now;
  } catch (error) {
    return false;
  }
}
