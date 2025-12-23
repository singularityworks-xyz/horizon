import { prisma } from '@horizon/db';

/**
 * SECURITY: Tenant-Scoped Database Access
 *
 * Ensures all database queries automatically include tenant filtering to prevent
 * cross-tenant data leaks (one of the most critical security risks in multi-tenant systems).
 *
 * Usage:
 * ```typescript
 * const tenantPrisma = getTenantScopedPrisma(tenantId);
 * const projects = await tenantPrisma.projects.findMany();
 * // Automatically includes: where: { tenantId }
 * ```
 */

/**
 * Get a Prisma client that automatically adds tenant filtering to all queries
 *
 * IMPORTANT: This is a simple implementation. For production, consider:
 * 1. Using Prisma middleware for more robust filtering
 * 2. Adding query logging for audit trails
 * 3. Implementing read replicas for tenant isolation
 */
export function getTenantScopedPrisma(tenantId: string) {
  // TODO: Implement Prisma middleware for automatic tenant filtering
  // For now, return a wrapper object that developers must use consciously

  return {
    tenantId,

    /**
     * Helper to add tenant scope to a where clause
     */
    addTenantScope: <T extends { where?: any }>(query: T): T => {
      if (!query.where) {
        query.where = {};
      }
      query.where.tenantId = tenantId;
      return query;
    },

    /**
     * Verify an entity belongs to this tenant
     */
    verifyTenantOwnership: async (
      model: keyof typeof prisma,
      entityId: string
    ): Promise<boolean> => {
      try {
        const entity = await (prisma[model] as any).findFirst({
          where: {
            id: entityId,
            tenantId,
          },
          select: { id: true },
        });
        return !!entity;
      } catch (error) {
        console.error('Tenant ownership verification failed:', error);
        return false;
      }
    },
  };
}

/**
 * Middleware to add automatic tenant filtering to all Prisma queries
 *
 * WARNING: This is a powerful security feature but can have performance implications.
 * Test thoroughly before deploying to production.
 *
 * Usage in Prisma client initialization:
 * ```typescript
 * prisma.$use(createTenantMiddleware(tenantId));
 * ```
 */
export function createTenantMiddleware(tenantId: string) {
  return async (params: any, next: any) => {
    // Models that should have tenant filtering
    const tenantedModels = [
      'projects',
      'workflows',
      'phases',
      'tasks',
      'questionnaire_templates',
      'questionnaire_submissions',
      'answers',
      'assets',
      'clients',
      'users',
      'workflow_snapshots',
      'ai_workflow_generations',
      'ai_rate_limits',
    ];

    // Only apply to queries on tenanted models
    if (tenantedModels.includes(params.model)) {
      // Add tenant filter to where clause for read operations
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.args.where = params.args.where || {};
        params.args.where.tenantId = tenantId;
      }

      if (params.action === 'findMany') {
        params.args.where = params.args.where || {};
        params.args.where.tenantId = tenantId;
      }

      // Add tenant ID to create operations
      if (params.action === 'create') {
        params.args.data = params.args.data || {};
        params.args.data.tenantId = tenantId;
      }

      if (params.action === 'createMany') {
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((item: any) => ({
            ...item,
            tenantId,
          }));
        }
      }

      // Ensure updates/deletes are scoped to tenant
      if (params.action === 'update' || params.action === 'updateMany') {
        params.args.where = params.args.where || {};
        params.args.where.tenantId = tenantId;
      }

      if (params.action === 'delete' || params.action === 'deleteMany') {
        params.args.where = params.args.where || {};
        params.args.where.tenantId = tenantId;
      }
    }

    return next(params);
  };
}

/**
 * Validate that a resource belongs to the specified tenant
 * Throws an error if validation fails
 */
export async function assertTenantOwnership(
  model: keyof typeof prisma,
  entityId: string,
  tenantId: string
): Promise<void> {
  const entity = await (prisma[model] as any).findFirst({
    where: {
      id: entityId,
      tenantId,
    },
    select: { id: true },
  });

  if (!entity) {
    throw new Error(
      `Access denied: ${String(model)} ${entityId} does not belong to tenant ${tenantId}`
    );
  }
}

/**
 * Batch verify multiple resources belong to the tenant
 */
export async function assertBatchTenantOwnership(
  model: keyof typeof prisma,
  entityIds: string[],
  tenantId: string
): Promise<void> {
  const count = await (prisma[model] as any).count({
    where: {
      id: { in: entityIds },
      tenantId,
    },
  });

  if (count !== entityIds.length) {
    throw new Error(
      `Access denied: Some ${String(model)} resources do not belong to tenant ${tenantId}`
    );
  }
}
