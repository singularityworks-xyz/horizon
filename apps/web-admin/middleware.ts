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

    // For authenticated users, add tenant context headers
    // NOTE: These headers are for propagation only - authorization decisions
    // must re-validate from session/DB, never trust headers as source of truth
    if (session) {
      // TODO: Replace with real tenant lookup from database
      // This is placeholder until tenant validation helpers are implemented
      const tenantContext = {
        tenantId: 'default-tenant-id', // Will be replaced with real lookup
        userId: session.user.id,
        role: 'admin', // Will be replaced with role lookup from DB
      };

      // Add tenant context to request headers for downstream use
      // These are NOT trusted for authorization - only for convenience
      const response = NextResponse.next();
      response.headers.set('x-tenant-id', tenantContext.tenantId);
      response.headers.set('x-user-id', tenantContext.userId);
      response.headers.set('x-user-role', tenantContext.role);
      response.headers.set('x-session-id', session.session.id);

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
