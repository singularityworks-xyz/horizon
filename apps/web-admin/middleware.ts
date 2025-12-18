import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// Define protected routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/projects",
  "/clients",
  "/questionnaires",
  "/workflows",
  "/settings",
]

// Define auth routes that should redirect to dashboard if already authenticated
const authRoutes = ["/signin", "/signup"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: Object.fromEntries(request.headers.entries()),
    })

    // Handle auth route redirects for authenticated users
    if (session && authRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Handle protected route access for unauthenticated users
    if (!session && protectedRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/signin", request.url))
    }

    // For authenticated users, add tenant context headers
    // NOTE: These headers are for propagation only - authorization decisions
    // must re-validate from session/DB, never trust headers as source of truth
    if (session) {
      // TODO: Replace with real tenant lookup from database
      // This is placeholder until tenant validation helpers are implemented
      const tenantContext = {
        tenantId: "default-tenant-id", // Will be replaced with real lookup
        userId: session.user.id,
        role: "admin", // Will be replaced with role lookup from DB
      }

      // Add tenant context to request headers for downstream use
      // These are NOT trusted for authorization - only for convenience
      const response = NextResponse.next()
      response.headers.set("x-tenant-id", tenantContext.tenantId)
      response.headers.set("x-user-id", tenantContext.userId)
      response.headers.set("x-user-role", tenantContext.role)
      response.headers.set("x-session-id", session.session.id)

      return response
    }

    return NextResponse.next()
  } catch (error) {
    // On session verification errors, redirect to signin
    console.error("Middleware session verification error:", error)
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/signin", request.url))
    }
    return NextResponse.next()
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
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
