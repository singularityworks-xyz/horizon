import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

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

  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: Object.fromEntries(request.headers.entries()),
  })

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (session && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // If user is not authenticated and trying to access protected routes, redirect to signin
  if (!session && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/signin", request.url))
  }

  // For authenticated users, add tenant context
  if (session) {
    // TODO: In a real app, you'd look up the user's tenant from the database
    // For now, we'll add a placeholder tenant context
    const tenantContext = {
      tenantId: "default-tenant-id", // This would come from user lookup
      userId: session.user.id,
      role: "admin", // This would come from role lookup
    }

    // Add tenant context to request headers for downstream use
    const response = NextResponse.next()
    response.headers.set("x-tenant-id", tenantContext.tenantId)
    response.headers.set("x-user-id", tenantContext.userId)
    response.headers.set("x-user-role", tenantContext.role)

    return response
  }

  return NextResponse.next()
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
