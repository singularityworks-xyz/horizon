// Centralized Node.js runtime declaration for API routes
// Import this in any API route that needs Node.js runtime (Prisma, database access, etc.)

export const runtime = 'nodejs';

// This ensures all database-dependent API routes run on Node.js runtime
// instead of Edge runtime, which doesn't support:
// - Prisma database operations
// - Better Auth database sessions
// - File system operations
// - Node.js crypto module

// Usage: import { runtime } from "@/lib/api-runtime" in any API route file
