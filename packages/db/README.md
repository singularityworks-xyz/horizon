# @horizon/db

Database schema, migrations, and client configuration for Horizon. This package provides tenant-scoped data models and Prisma client setup.

## Overview

All data models are tenant-scoped to ensure multi-tenancy isolation. Every table includes a `tenantId` foreign key that prevents data leakage between tenants.

## Setup

### Prerequisites

- PostgreSQL database (Neon recommended)
- `DATABASE_URL` environment variable set

#### Environment Setup

Create a `.env` file in your project root with:

```bash
# Neon Database Connection (Prisma v7)
# Get this URL from your Neon dashboard: https://console.neon.tech
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"

# For local development with PostgreSQL:
# DATABASE_URL="postgresql://username:password@localhost:5432/horizon_dev"
```

**Note**: Prisma v7 requires the connection URL to be provided via environment variables, not in the schema file.

### Installation

Install dependencies in the monorepo root:

```bash
pnpm install
```

### Database Setup

1. **Set Environment Variable**

   Create a `.env` file in the monorepo root or set `DATABASE_URL`:

   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/horizon?schema=public"
   ```

   For Neon: Use the connection string provided by Neon dashboard.

2. **Generate Prisma Client**

   ```bash
   cd packages/db
   pnpm prisma:generate
   ```

3. **Run Migrations**

   ```bash
   cd packages/db
   npx prisma migrate deploy
   ```

   For development (creates and applies migrations):

   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

4. **Format Schema**

   ```bash
   pnpm prisma:format
   ```

## Usage

### Importing the Prisma Client

In other packages/apps, import the Prisma client:

```typescript
import { prisma } from '@horizon/db'

// Use in your code
const tenants = await prisma.tenant.findMany()
```

### Database Operations

All operations are tenant-scoped. Always include `tenantId` in your queries:

```typescript
// ✅ Correct: Tenant-scoped query
const projects = await prisma.project.findMany({
  where: { tenantId: 'tenant-123' }
})

// ❌ Incorrect: Missing tenant isolation
const projects = await prisma.project.findMany()
```

### Creating Records

When creating records, always include the `tenantId`:

```typescript
const project = await prisma.project.create({
  data: {
    tenantId: 'tenant-123',
    name: 'New Project',
    status: 'DRAFT'
  }
})
```

## Schema Overview

### Core Entities

- **Tenant**: Agencies/organizations
- **User**: Users within tenants
- **Role**: User roles (admin, client, internal)
- **Project**: Client projects
- **Client**: Client entities

### Domain Entities

- **QuestionnaireTemplate**: Reusable questionnaire templates
- **Question**: Questions within templates
- **Answer**: Responses to questions
- **Asset**: File uploads and documents
- **Workflow**: Project workflows (manual or AI-generated)
- **Phase**: Workflow phases
- **Task**: Individual tasks within phases
- **Progress**: Progress tracking and rollups

## Development

### Schema Changes

1. Edit `prisma/schema.prisma`
2. Format: `pnpm prisma:format`
3. Generate migration: `npx prisma migrate dev --name descriptive_name`
4. Push changes and regenerate client: `pnpm prisma:generate`

### Database Tools

- **Studio**: `npx prisma studio` (opens database browser)
- **Reset DB**: `npx prisma migrate reset` (⚠️ destructive)
- **Seed**: Create `prisma/seed.ts` and run `npx prisma db seed`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |

## Notes

- All models use `cuid()` for IDs for better distribution
- Foreign keys use `Cascade` delete where safe, `Restrict` for critical relations
- Composite unique constraints enforce tenant scoping (e.g., unique email per tenant)
- Progress tracking uses snapshot-based approach for historical data
