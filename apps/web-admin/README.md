# Horizon Web Admin

Admin portal for Horizon - manage clients, review questionnaires, edit workflows.

## Authentication Setup

This app uses Better Auth for authentication with session-based security and RBAC.

### Environment Variables

Create a `.env.local` file in the web-admin directory:

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET="your-super-secret-key-change-in-production"
BETTER_AUTH_URL="http://localhost:3000"

# Database (inherited from monorepo root)
DATABASE_URL="postgresql://username:password@localhost:5432/horizon_dev"
```

### Dependencies

Authentication dependencies are included in `package.json`:
- `better-auth`: Core authentication library
- `@better-auth/utils`: Utility functions

### Setup Steps

1. **Install dependencies** (already done):
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   - Set `BETTER_AUTH_SECRET` to a secure random string
   - Ensure `DATABASE_URL` points to your database

3. **Start development server**:
   ```bash
   pnpm dev
   ```

### Auth Flow

#### Client-Side Usage

```typescript
import { authHelpers } from "@/lib/auth-client"

// Sign in
const result = await authHelpers.signIn("user@example.com", "password")
if (result.error) {
  console.error("Sign in failed:", result.error)
}

// Sign up
const result = await authHelpers.signUp("user@example.com", "password", "User Name")

// Sign out
await authHelpers.signOut()

// Check session
const { valid, session } = await authHelpers.verifySession()
```

#### Server-Side Usage

```typescript
import { authServer } from "@/lib/auth-server"

// Get current session
const session = await authServer.getSession()

// Require authentication (throws if not authenticated)
const session = await authServer.requireSession()
```

#### RBAC (Role-Based Access Control)

```typescript
import { rbac } from "@/lib/auth-rbac"

// Require authentication and get tenant context
const context = await rbac.requireAuth()
// context = { tenantId, userId, role }

// Require specific role
const adminContext = await rbac.requireAdmin()
const clientContext = await rbac.requireClient()

// Require multiple roles
const context = await rbac.requireRole(["admin", "client"])

// Check roles without throwing
const isAdmin = await rbac.isAdmin()
const isClient = await rbac.isClient()
```

#### In Server Components/Actions

```typescript
// app/dashboard/page.tsx
import { rbac } from "@/lib/auth-rbac"

export default async function DashboardPage() {
  const context = await rbac.requireAuth()

  return (
    <div>
      <h1>Welcome, {context.role}!</h1>
      <p>Tenant: {context.tenantId}</p>
    </div>
  )
}

// Server Actions
"use server"

import { rbac } from "@/lib/auth-rbac"

export async function createProject(formData: FormData) {
  const context = await rbac.requireAdmin() // Only admins can create projects

  // Create project with tenantId from context
  // ...
}
```

### Middleware Behavior

The middleware automatically:
- Redirects unauthenticated users from protected routes to `/signin`
- Redirects authenticated users from auth routes to `/dashboard`
- Adds tenant context headers for downstream use

**Protected routes**: `/dashboard`, `/projects`, `/clients`, `/questionnaires`, `/workflows`, `/settings`

**Auth routes**: `/signin`, `/signup`

### Security Notes

- Sessions use HTTP-only cookies
- CSRF protection enabled
- All data access is tenant-scoped
- RBAC enforced at the application level
- Middleware runs on all routes except `/api/auth/*`

### Current Limitations

- Tenant context uses placeholder values (needs database integration)
- Email verification disabled (can be enabled later)
- No password reset flow (can be added with Better Auth plugins)
- Single tenant mode (will be expanded to multi-tenant)

## Security & Authorization

This app implements comprehensive security middleware and RBAC (Role-Based Access Control) for multi-tenant isolation.

### Middleware Behavior

The middleware automatically:
- **Session Verification**: Validates Better Auth sessions on all requests
- **Route Protection**: Redirects unauthenticated users from protected routes to `/signin`
- **Auth Route Handling**: Redirects authenticated users from auth routes to `/dashboard`
- **Tenant Context**: Adds tenant/user headers for downstream use (headers are NOT trusted for auth decisions)
- **Error Handling**: Redirects to signin on session verification failures

**Protected routes**: `/dashboard`, `/projects`, `/clients`, `/questionnaires`, `/workflows`, `/settings`

### Using RBAC Helpers

#### In Server Components

```typescript
// Require authentication (any role)
const context = await rbac.requireAuth()
// context = { tenantId, userId, role, tenant: { id, name, slug } }

// Require specific roles
const adminContext = await rbac.requireAdmin()  // Only admins
const clientContext = await rbac.requireClient() // Only clients

// Check roles without throwing
const isAdmin = await rbac.isAdmin()
const isClient = await rbac.isClient()
```

#### In Server Actions

```typescript
"use server"

import { rbac } from "@/lib/auth-rbac"

export async function createProject(formData: FormData) {
  // Require admin role
  const context = await rbac.requireAdmin()

  // Use context for tenant-scoped operations
  const project = await prisma.project.create({
    data: {
      tenantId: context.tenantId,  // Always use validated tenantId
      name: formData.get("name"),
      // ... other fields
    }
  })

  return project
}
```

### API Route Guards

#### Basic Usage

```typescript
// app/api/projects/route.ts
import { guards } from "@/lib/security/guards"

export const GET = guards.authenticated(async (request, context) => {
  // context is validated: user is authenticated + tenant access confirmed
  const projects = await prisma.project.findMany({
    where: { tenantId: context.tenantId }, // Always scope by tenant
  })

  return Response.json(projects)
})

export const POST = guards.adminOnly(async (request, context) => {
  // Only admins can create projects
  const data = await request.json()

  const project = await prisma.project.create({
    data: {
      tenantId: context.tenantId,
      ...data
    }
  })

  return Response.json(project)
})
```

#### Advanced Guards

```typescript
// Admin access to specific tenant
export const PUT = guards.adminForTenant("specific-tenant-id")(
  async (request, context) => {
    // Guaranteed: user is admin AND has access to specific-tenant-id
    // context.tenantId will be "specific-tenant-id"
  }
)

// Client access to their own tenant
export const PATCH = guards.clientForTenant(context.tenantId)(
  async (request, context) => {
    // Client can only modify their own tenant's data
  }
)
```

#### Custom Guards

```typescript
import { withAuthGuard } from "@/lib/security/guards"

export const DELETE = withAuthGuard(
  async (request, context) => {
    // Custom validation logic here
    const project = await prisma.project.findFirst({
      where: {
        id: request.nextUrl.searchParams.get("id"),
        tenantId: context.tenantId, // Always scope queries
      }
    })

    if (!project) {
      return apiErrors.notFound("Project not found")
    }

    // Delete logic...
    return Response.json({ success: true })
  },
  {
    requiredRoles: ["admin"],        // Must be admin
    tenantId: "required-tenant-id",  // Must have access to this tenant
  }
)
```

### Tenant-Scoped Database Queries

Always ensure database queries are tenant-scoped:

```typescript
import { enforceTenantScope } from "@/lib/security/guards"

// Safe: Automatically adds tenantId to where clause
const projects = await prisma.project.findMany(
  enforceTenantScope(context.tenantId, {
    where: { status: "active" }
  })
)

// Alternative: Manual tenant scoping
const projects = await prisma.project.findMany({
  where: {
    tenantId: context.tenantId,  // NEVER forget this!
    status: "active"
  }
})
```

### Error Handling

API guards automatically return appropriate HTTP responses:

- **401 Unauthorized**: Missing/invalid session
- **403 Forbidden**: Insufficient permissions or tenant access denied
- **400 Bad Request**: Invalid request data
- **500 Internal Error**: Unexpected server errors

### Security Principles

1. **Fail Closed**: All authorization checks default to denial
2. **Re-validate**: Never trust headers for auth decisions - always re-validate from DB
3. **Tenant Isolation**: Every database query must include `tenantId` filter
4. **Role Checks**: Validate permissions before executing sensitive operations
5. **Audit Trail**: Log security-relevant actions for compliance

### Future Enhancements

- Email verification
- Password reset
- Social login (GitHub, Google)
- Multi-tenant user management
- Audit logging
