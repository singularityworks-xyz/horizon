import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { validateUserHasTenantAccess } from '@/lib/security/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Validate Session using Better Auth
    const session = await auth.api.getSession({
      headers: Object.fromEntries(request.headers.entries()),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get Tenant Context from Database
    try {
      // Use the fixed validation that queries the DB
      const tenantContext = await validateUserHasTenantAccess(session.user.id);

      // 3. Return Context
      return NextResponse.json({
        user: session.user,
        tenant: tenantContext.tenant,
        role: tenantContext.role,
        permissions: [], // We'll populate this if needed, or client can infer from role
      });
    } catch (error) {
      // User has a session but no tenant access
      console.error('Tenant access check failed:', error);
      return NextResponse.json({ error: 'No tenant access' }, { status: 403 });
    }
  } catch (error) {
    console.error('Tenant context error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
