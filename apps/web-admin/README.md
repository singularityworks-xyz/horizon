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

### Future Enhancements

- Email verification
- Password reset
- Social login (GitHub, Google)
- Multi-tenant user management
- Audit logging
