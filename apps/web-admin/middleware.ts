import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// CORS configuration for web-client
// Helper to get CORS headers based on request origin
function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = [
    process.env.WEB_CLIENT_URL || 'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3003',
  ];
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With, x-tenant-id, x-user-id, x-user-role, x-session-id',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/projects',
  '/clients',
  '/questionnaires',
  '/workflows',
  '/settings',
];

// Define auth routes that should redirect to dashboard if already authenticated
const authRoutes = ['/signin', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: getCorsHeaders(request),
    });
  }

  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: Object.fromEntries(request.headers.entries()),
    });

    // Handle auth route redirects for authenticated users
    if (session && authRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Handle protected route access for unauthenticated users
    if (!session && protectedRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    // For authenticated users, add user info to headers
    // NOTE: Tenant context validation happens in API routes using validateTenantAccess()
    // Middleware only provides session info - authorization is done server-side with DB lookup
    if (session) {
      const response = NextResponse.next();

      // Only set user ID from session - tenant/role validation happens in API routes
      // This prevents hardcoded values and ensures DB validation
      response.headers.set('x-user-id', session.user.id);
      response.headers.set('x-session-id', session.session.id);

      // Note: x-tenant-id and x-user-role are NOT set here
      // API routes must call validateTenantAccess() or validateUserHasTenantAccess()
      // to get the actual tenant context from the database

      // Add CORS headers
      const headers = getCorsHeaders(request);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    const response = NextResponse.next();
    // Add CORS headers
    const headers = getCorsHeaders(request);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    // On session verification errors, redirect to signin
    console.error('Middleware session verification error:', error);
    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
    const response = NextResponse.next();
    // Add CORS headers
    const headers = getCorsHeaders(request);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Better Auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
