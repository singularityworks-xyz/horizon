import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@horizon/db';
import { guards, apiErrors } from '@/lib/security/guards';
import { runtime } from '@/lib/api-runtime';
import { createClientSnapshotQuery } from '@/lib/ai/workflow-generation/visibility';

// GET /api/client/workflow-snapshots - Client view of published workflow snapshots
export const GET = guards.clientOnly(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Clients can only see snapshots for their own projects
    // If no projectId specified, return all accessible snapshots
    const query = createClientSnapshotQuery(context.tenantId, projectId || undefined);

    const snapshots = await prisma.workflowSnapshot.findMany(query);

    // Transform response to be client-friendly
    const clientSnapshots = snapshots.map((snapshot) => ({
      id: snapshot.id,
      workflowId: snapshot.workflowId,
      project: snapshot.project,
      workflow: snapshot.workflow,
      phases: snapshot.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        intent: phase.intent,
        description: phase.description,
        order: phase.order,
        tasks: phase.tasks,
      })),
      progress: snapshot.progress
        ? {
            totalTasks: snapshot.progress.totalTasks,
            completedTasks: snapshot.progress.completedTasks,
            completionPercentage:
              snapshot.progress.totalTasks > 0
                ? Math.round(
                    (snapshot.progress.completedTasks / snapshot.progress.totalTasks) * 100
                  )
                : 0,
            perPhase: snapshot.progress.perPhase,
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
