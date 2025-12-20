// Client Workflow Visibility Helper
// Enforces approval gate for client-facing workflow queries

import type { Prisma } from '@horizon/db';
import { createWorkflowSnapshot } from '../workflow-snapshots/create';

/**
 * LEGACY: Use getClientSnapshotWhere() instead for new client queries
 * This helper is deprecated but kept for backward compatibility
 */
export function getClientWorkflowWhere(
  tenantId: string,
  projectId?: string
): {
  tenantId: string;
  projectId?: string;
  OR: Array<
    | {
        source: string;
        aiApprovedAt: { not: null };
      }
    | {
        source: { not: string };
      }
  >;
} {
  return {
    tenantId,
    ...(projectId && { projectId }),
    OR: [
      // AI-generated workflows must be approved
      {
        source: 'AI_GENERATED',
        aiApprovedAt: { not: null },
      },
      // Manual workflows are always visible (no approval gate)
      {
        source: { not: 'AI_GENERATED' },
      },
    ],
  };
}

/**
 * Creates a where clause for client snapshot queries
 * Clients read from WorkflowSnapshot table, not Workflow table
 */
export function getClientSnapshotWhere(
  tenantId: string,
  projectId?: string
): {
  tenantId: string;
  projectId?: string;
  isCurrent: boolean;
} {
  return {
    tenantId,
    ...(projectId && { projectId }),
    isCurrent: true, // Only current snapshots are visible to clients
  };
}

/**
 * Type-safe helper for Prisma workflow queries with client visibility
 * DEPRECATED: Use createClientSnapshotQuery() for new client queries
 */
export function createClientWorkflowQuery(tenantId: string, projectId?: string) {
  return {
    where: getClientWorkflowWhere(tenantId, projectId),
    include: {
      project: {
        select: { id: true, name: true },
      },
      phases: {
        include: {
          tasks: true,
        },
        orderBy: { order: 'asc' as const },
      },
      aiApprovedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  };
}

/**
 * Type-safe helper for Prisma snapshot queries with client visibility
 * Clients read from WorkflowSnapshot table for immutable, computed views
 */
export function createClientSnapshotQuery(tenantId: string, projectId?: string) {
  return {
    where: getClientSnapshotWhere(tenantId, projectId),
    include: {
      project: {
        select: { id: true, name: true, status: true },
      },
      phases: {
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              priority: true,
              estimatedDurationDays: true,
              isMilestone: true,
            },
            orderBy: { order: 'asc' as const },
          },
        },
        orderBy: { order: 'asc' as const },
      },
      progress: true,
      workflow: {
        select: {
          id: true,
          name: true,
          description: true,
          source: true,
          aiApprovedAt: true,
          aiApprovedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  };
}

/**
 * Admin query helper - shows all workflows (approved + unapproved)
 */
export function createAdminWorkflowQuery(tenantId: string, projectId?: string) {
  return {
    where: {
      tenantId,
      ...(projectId && { projectId }),
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      phases: {
        include: {
          tasks: true,
        },
        orderBy: { order: 'asc' as const },
      },
      aiApprovedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      aiWorkflowGenerations: {
        orderBy: { createdAt: 'desc' as const },
        take: 1, // Most recent generation attempt
      },
    },
    orderBy: { createdAt: 'desc' as const },
  };
}

/**
 * Helper to check if a workflow is visible to clients
 */
export function isWorkflowVisibleToClient(workflow: {
  source: string;
  aiApprovedAt: Date | null;
}): boolean {
  if (workflow.source !== 'AI_GENERATED') {
    return true; // Manual workflows always visible
  }

  return workflow.aiApprovedAt !== null;
}

/**
 * Helper to approve an AI workflow
 */
export async function approveWorkflow(
  workflowId: string,
  approvedById: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { prisma } = await import('@horizon/db');

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      select: {
        source: true,
        aiApprovedAt: true,
        tenantId: true,
      },
    });

    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    if (workflow.source !== 'AI_GENERATED') {
      return { success: false, error: 'Only AI-generated workflows can be approved' };
    }

    if (workflow.aiApprovedAt) {
      return { success: false, error: 'Workflow is already approved' };
    }

    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        aiApprovedAt: new Date(),
        aiApprovedById: approvedById,
        aiApprovalNotes: notes,
        status: 'ACTIVE', // AI approval automatically makes workflow active + triggers snapshot
        isManuallyEdited: true,
        lastEditedById: approvedById,
        lastEditedAt: new Date(),
      },
    });

    // Create snapshot for client visibility (this will be idempotent if already exists)
    const snapshotResult = await createWorkflowSnapshot(workflowId, approvedById);

    // Note: We don't fail the approval if snapshot creation fails, but we log it
    if (snapshotResult.error) {
      console.error(`Failed to create snapshot after AI approval: ${snapshotResult.error}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
