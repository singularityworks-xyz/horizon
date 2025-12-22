import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { createClientSnapshotQuery } from '@/lib/ai/workflow-generation/visibility';
import { runtime } from '@/lib/api-runtime';
import { apiErrors, guards } from '@/lib/security/guards';

// GET /api/client/workflow-snapshots - Client view of published workflow snapshots
export const GET = guards.clientAccess(async (request, context, params) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Clients can only see snapshots for their own projects
    // If no projectId specified, return all accessible snapshots
    const query = createClientSnapshotQuery(context.tenantId, projectId || undefined);

    const snapshots = await prisma.workflow_snapshots.findMany(query);

    // Transform response to be client-friendly
    const clientSnapshots = (snapshots as any).map((snapshot: any) => ({
      id: snapshot.id,
      workflowId: snapshot.workflowId,
      project: snapshot.projects,
      workflow: snapshot.workflows,
      phases: (snapshot.workflow_snapshot_phases || []).map((phase: any) => ({
        id: phase.id,
        name: phase.name,
        intent: phase.intent,
        description: phase.description,
        order: phase.order,
        tasks: phase.workflow_snapshot_tasks,
      })),
      progress: snapshot.workflow_snapshot_progress
        ? {
            totalTasks: snapshot.workflow_snapshot_progress.totalTasks,
            completedTasks: snapshot.workflow_snapshot_progress.completedTasks,
            completionPercentage:
              snapshot.workflow_snapshot_progress.totalTasks > 0
                ? Math.round(
                    (snapshot.workflow_snapshot_progress.completedTasks /
                      snapshot.workflow_snapshot_progress.totalTasks) *
                      100
                  )
                : 0,
            perPhase: snapshot.workflow_snapshot_progress.perPhase,
          }
        : null,
      timeline: snapshot.timeline, // Computed timeline data
      createdAt: snapshot.createdAt,
    }));

    return NextResponse.json({ snapshots: clientSnapshots });
  } catch (error) {
    console.error('Failed to fetch client workflow snapshots:', error);
    return apiErrors.internalError('Failed to fetch workflow snapshots');
  }
});
