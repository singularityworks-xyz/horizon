# Horizon Web Admin

Admin portal for Horizon - manage clients, review questionnaires, edit workflows.

## Authentication Setup

This app uses Better Auth for authentication with session-based security and RBAC.

## Environment Setup

### Development

1. Copy the environment template:

```bash
cp .env.example .env.local
```

2. Fill in your environment variables in `.env.local`

3. Start the development server:

```bash
npm run dev
```

### Environment Variables

Required variables:

- `BETTER_AUTH_SECRET` - Secret for Better Auth (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - URL of your application (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_BETTER_AUTH_URL` - Public URL for client-side auth (same as BETTER_AUTH_URL in development)
- `DATABASE_URL` - PostgreSQL connection string
- `OPENROUTER_API_KEY` - API key for OpenRouter
- `OPENAI_API_KEY` - API key for OpenAI
- `GEMINI_API_KEY` - API key for Google Gemini
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - Cloudflare R2 access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret key
- `CLOUDFLARE_R2_ACCOUNT_ID` - Cloudflare account ID
- `CLOUDFLARE_R2_BUCKET_NAME` - Cloudflare R2 bucket name

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
import { authHelpers } from '@/lib/auth-client';

// Sign in
const result = await authHelpers.signIn('user@example.com', 'password');
if (result.error) {
  console.error('Sign in failed:', result.error);
}

// Sign up
const result = await authHelpers.signUp('user@example.com', 'password', 'User Name');

// Sign out
await authHelpers.signOut();

// Check session
const { valid, session } = await authHelpers.verifySession();
```

#### Server-Side Usage

```typescript
import { authServer } from '@/lib/auth-server';

// Get current session
const session = await authServer.getSession();

// Require authentication (throws if not authenticated)
const session = await authServer.requireSession();
```

#### RBAC (Role-Based Access Control)

```typescript
import { rbac } from '@/lib/auth-rbac';

// Require authentication and get tenant context
const context = await rbac.requireAuth();
// context = { tenantId, userId, role }

// Require specific role
const adminContext = await rbac.requireAdmin();
const clientContext = await rbac.requireClient();

// Require multiple roles
const context = await rbac.requireRole(['admin', 'client']);

// Check roles without throwing
const isAdmin = await rbac.isAdmin();
const isClient = await rbac.isClient();
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
const context = await rbac.requireAuth();
// context = { tenantId, userId, role, tenant: { id, name, slug } }

// Require specific roles
const adminContext = await rbac.requireAdmin(); // Only admins
const clientContext = await rbac.requireClient(); // Only clients

// Check roles without throwing
const isAdmin = await rbac.isAdmin();
const isClient = await rbac.isClient();
```

#### In Server Actions

```typescript
'use server';

import { rbac } from '@/lib/auth-rbac';

export async function createProject(formData: FormData) {
  // Require admin role
  const context = await rbac.requireAdmin();

  // Use context for tenant-scoped operations
  const project = await prisma.project.create({
    data: {
      tenantId: context.tenantId, // Always use validated tenantId
      name: formData.get('name'),
      // ... other fields
    },
  });

  return project;
}
```

### API Route Guards

#### Basic Usage

```typescript
// app/api/projects/route.ts
import { guards } from '@/lib/security/guards';

export const GET = guards.authenticated(async (request, context) => {
  // context is validated: user is authenticated + tenant access confirmed
  const projects = await prisma.project.findMany({
    where: { tenantId: context.tenantId }, // Always scope by tenant
  });

  return Response.json(projects);
});

export const POST = guards.adminOnly(async (request, context) => {
  // Only admins can create projects
  const data = await request.json();

  const project = await prisma.project.create({
    data: {
      tenantId: context.tenantId,
      ...data,
    },
  });

  return Response.json(project);
});
```

#### Advanced Guards

```typescript
// Admin access to specific tenant
export const PUT = guards.adminForTenant('specific-tenant-id')(async (request, context) => {
  // Guaranteed: user is admin AND has access to specific-tenant-id
  // context.tenantId will be "specific-tenant-id"
});

// Client access to their own tenant
export const PATCH = guards.clientForTenant(context.tenantId)(async (request, context) => {
  // Client can only modify their own tenant's data
});
```

#### Custom Guards

```typescript
import { withAuthGuard } from '@/lib/security/guards';

export const DELETE = withAuthGuard(
  async (request, context) => {
    // Custom validation logic here
    const project = await prisma.project.findFirst({
      where: {
        id: request.nextUrl.searchParams.get('id'),
        tenantId: context.tenantId, // Always scope queries
      },
    });

    if (!project) {
      return apiErrors.notFound('Project not found');
    }

    // Delete logic...
    return Response.json({ success: true });
  },
  {
    requiredRoles: ['admin'], // Must be admin
    tenantId: 'required-tenant-id', // Must have access to this tenant
  }
);
```

### Tenant-Scoped Database Queries

Always ensure database queries are tenant-scoped:

```typescript
import { enforceTenantScope } from '@/lib/security/guards';

// Safe: Automatically adds tenantId to where clause
const projects = await prisma.project.findMany(
  enforceTenantScope(context.tenantId, {
    where: { status: 'active' },
  })
);

// Alternative: Manual tenant scoping
const projects = await prisma.project.findMany({
  where: {
    tenantId: context.tenantId, // NEVER forget this!
    status: 'active',
  },
});
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

## Asset Management System

Horizon includes a comprehensive file storage system using Cloudflare R2 for secure, scalable asset management.

### Cloudflare R2 Setup

1. **Create R2 Bucket**:
   - Go to Cloudflare Dashboard → R2
   - Create a new bucket (e.g., `horizon-assets`)
   - Note the Account ID from the R2 overview

2. **Generate API Tokens**:
   - Go to Cloudflare Dashboard → R2 → Manage API Tokens
   - Create a new token with "Object Read & Write" permissions
   - Note the Access Key ID and Secret Access Key

3. **Configure CORS** (if needed for direct uploads):
   - In R2 bucket settings, configure CORS policy:
   ```json
   {
     "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
     "AllowedMethods": ["GET", "PUT", "POST"],
     "AllowedHeaders": ["*"],
     "MaxAgeSeconds": 3000
   }
   ```

### Environment Variables

Add these to your `.env.local`:

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key-id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-access-key"
CLOUDFLARE_R2_ACCOUNT_ID="your-account-id"
CLOUDFLARE_R2_BUCKET_NAME="horizon-assets"
CLOUDFLARE_R2_REGION="auto"  # Usually 'auto' for R2
CLOUDFLARE_R2_PUBLIC_BASE_URL="https://your-account-id.r2.cloudflarestorage.com"
```

### File Upload Flow

Assets follow a secure two-step upload process:

1. **Presign Upload** (`POST /api/assets/presign`):
   - Validates file type, size, and tenant permissions
   - Returns presigned S3 URL for direct upload to R2
   - Generates asset ID and storage key

2. **Complete Upload** (`POST /api/assets/complete`):
   - Verifies upload completion and runs security scans
   - Creates database record with metadata
   - Returns download URL

### Asset Linking

Assets can be linked to different entities:

- **Projects**: General project assets
- **Questions**: File upload question responses
- **Answers**: Direct answer attachments
- **Workflows**: Workflow-related documents
- **Phases**: Phase-specific assets
- **Tasks**: Task attachments

### Access Control

Assets support different access levels:

- **TENANT**: All users in the tenant can access
- **ADMIN_ONLY**: Only admins can access
- **PUBLIC**: Public access (future feature)

### File Constraints

- **Maximum Size**: 25MB per file
- **Allowed Types**:
  - Documents: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, RTF
  - Images: JPEG, PNG, GIF, WebP, SVG
  - Archives: ZIP, RAR, 7Z

### API Usage Examples

#### Upload Asset

```typescript
// 1. Get presigned URL
const presignResponse = await fetch('/api/assets/presign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'document.pdf',
    mimeType: 'application/pdf',
    size: 1024000, // bytes
    projectId: 'project-123', // optional linking
  })
})

const { assetId, uploadUrl } = await presignResponse.json()

// 2. Upload file directly to R2
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileBlob,
  headers: {
    'Content-Type': 'application/pdf'
  }
})

// 3. Complete upload
const completeResponse = await fetch('/api/assets/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assetId,
    storageKey: '...', // from presign response
    checksum: '...', // SHA-256 hash
    virusScanResult: { isClean: true, ... },
    presignData: { ... } // original presign data
  })
})
```

#### List Assets

```typescript
// Get assets for a project
const response = await fetch('/api/assets?projectId=project-123&limit=20');
const { assets, pagination } = await response.json();

// Filter by multiple criteria
const response = await fetch('/api/assets?workflowId=workflow-456&accessLevel=TENANT');
```

#### Download Asset

```typescript
// Get asset with download URL
const response = await fetch('/api/assets/asset-123');
const { asset, downloadUrl, expiresAt } = await response.json();

// Download file (URL expires in 5 minutes)
window.open(downloadUrl, '_blank');
```

### Security Features

- **Virus Scanning**: Integrated malware detection (stubbed for now)
- **Checksum Verification**: SHA-256 integrity checks
- **Tenant Isolation**: Assets are scoped to tenant storage paths
- **Access Control**: Role-based download permissions
- **File Type Validation**: Strict MIME type checking
- **Size Limits**: Configurable upload size restrictions

### Testing

Run asset management tests:

```bash
# Run all tests
pnpm test

# Run specific asset tests
pnpm test presign.integration.test.ts
pnpm test complete.integration.test.ts
```

### Future Enhancements

- Real virus scanning integration (ClamAV, VirusTotal)
- Asset versioning UI
- Bulk upload/download
- Asset search and tagging
- Thumbnail generation for images
- CDN integration for faster downloads
- Asset analytics and usage tracking
