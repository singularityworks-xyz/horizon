import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorkflowSnapshot, getCurrentSnapshot } from '../create';

// Mock Prisma
const mockPrisma = {
  workflow: {
    findFirst: vi.fn(),
  },
  workflowSnapshot: {
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  phase: {
    findMany: vi.fn(),
  },
  task: {
    findMany: vi.fn(),
  },
  taskDependency: {
    findMany: vi.fn(),
  },
  workflowSnapshotPhase: {
    create: vi.fn(),
  },
  workflowSnapshotTask: {
    create: vi.fn(),
  },
  workflowSnapshotProgress: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@horizon/db', () => ({
  prisma: mockPrisma,
}));

// Mock computeWorkflowTimeline
vi.mock('../../workflow/compute', () => ({
  computeWorkflowTimeline: vi.fn(),
}));

import { computeWorkflowTimeline } from '../../workflow/compute';

describe('Workflow Snapshot Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkflowSnapshot', () => {
    const mockWorkflow = {
      tenantId: 'tenant-123',
      projectId: 'project-456',
      status: 'ACTIVE',
      phases: [
        {
          id: 'phase-1',
          name: 'Discovery',
          intent: 'DISCOVERY',
          description: 'Discovery phase',
          order: 0,
          tasks: [
            {
              id: 'task-1',
              title: 'Research',
              description: 'Research task',
              order: 0,
              priority: 'HIGH',
              estimatedDurationDays: 5,
              isMilestone: false,
            },
            {
              id: 'task-2',
              title: 'Analysis',
              description: 'Analysis task',
              order: 1,
              priority: 'MEDIUM',
              estimatedDurationDays: 3,
              isMilestone: true,
            },
          ],
        },
      ],
    };

    const mockTimeline = {
      totalDuration: 8,
      criticalPathDuration: 8,
      criticalPath: ['task-1', 'task-2'],
      taskTimelines: [
        {
          taskId: 'task-1',
          earliestStartDay: 0,
          earliestEndDay: 5,
          duration: 5,
          isOnCriticalPath: true,
        },
        {
          taskId: 'task-2',
          earliestStartDay: 5,
          earliestEndDay: 8,
          duration: 3,
          isOnCriticalPath: true,
        },
      ],
    };

    it('creates a new snapshot when none exists', async () => {
      // Mock no existing snapshot
      mockPrisma.workflowSnapshot.findFirst.mockResolvedValue(null);

      // Mock workflow lookup
      mockPrisma.workflow.findFirst.mockResolvedValue(mockWorkflow);

      // Mock phase and task lookups
      mockPrisma.phase.findMany.mockResolvedValue(mockWorkflow.phases);
      mockPrisma.taskDependency.findMany.mockResolvedValue([]);

      // Mock timeline computation
      vi.mocked(computeWorkflowTimeline).mockReturnValue(mockTimeline);

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const result = await callback(mockPrisma);
        return result;
      });

      // Mock snapshot creation
      mockPrisma.workflowSnapshot.create.mockResolvedValue({
        id: 'snapshot-123',
        tenantId: 'tenant-123',
        projectId: 'project-456',
        workflowId: 'workflow-789',
        version: 1,
        isCurrent: true,
        dependencies: [],
        timeline: mockTimeline,
        createdById: 'admin-123',
        createdAt: new Date(),
      });

      const result = await createWorkflowSnapshot('workflow-789', 'admin-123');

      expect(result).toEqual({
        snapshotId: 'snapshot-123',
      });

      // Verify transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // Verify snapshot was created
      expect(mockPrisma.workflowSnapshot.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-123',
          projectId: 'project-456',
          workflowId: 'workflow-789',
          version: 1,
          isCurrent: true,
          dependencies: [],
          timeline: mockTimeline,
          createdById: 'admin-123',
        },
      });

      // Verify timeline computation was called
      expect(computeWorkflowTimeline).toHaveBeenCalledWith(
        [
          { id: 'task-1', estimatedDurationDays: 5 },
          { id: 'task-2', estimatedDurationDays: 3 },
        ],
        []
      );

      // Verify phases and tasks were created
      expect(mockPrisma.workflowSnapshotPhase.create).toHaveBeenCalledWith({
        data: {
          snapshotId: 'snapshot-123',
          sourcePhaseId: 'phase-1',
          name: 'Discovery',
          intent: 'DISCOVERY',
          description: 'Discovery phase',
          order: 0,
        },
      });

      expect(mockPrisma.workflowSnapshotTask.create).toHaveBeenCalledTimes(2);

      // Verify progress was initialized
      expect(mockPrisma.workflowSnapshotProgress.create).toHaveBeenCalledWith({
        data: {
          snapshotId: 'snapshot-123',
          totalTasks: 2,
          completedTasks: 0,
          perPhase: {
            '0': {
              total: 2,
              completed: 0,
              percentage: 0,
            },
          },
        },
      });
    });

    it('returns existing snapshot when workflow is ACTIVE and snapshot exists', async () => {
      const existingSnapshot = {
        id: 'existing-snapshot-123',
        tenantId: 'tenant-123',
        projectId: 'project-456',
        isCurrent: true,
      };

      // Mock existing snapshot
      mockPrisma.workflowSnapshot.findFirst.mockResolvedValue(existingSnapshot);

      // Mock workflow lookup
      mockPrisma.workflow.findFirst.mockResolvedValue({
        ...mockWorkflow,
        status: 'ACTIVE',
      });

      const result = await createWorkflowSnapshot('workflow-789', 'admin-123');

      expect(result).toEqual({
        snapshotId: 'existing-snapshot-123',
        existed: true,
      });

      // Verify no new snapshot was created
      expect(mockPrisma.workflowSnapshot.create).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('fails when workflow is not ACTIVE', async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue({
        ...mockWorkflow,
        status: 'DRAFT',
      });

      const result = await createWorkflowSnapshot('workflow-789', 'admin-123');

      expect(result).toEqual({
        error: 'Workflow must be ACTIVE to create snapshot',
      });
    });

    it('fails when workflow not found', async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue(null);

      const result = await createWorkflowSnapshot('nonexistent-workflow', 'admin-123');

      expect(result).toEqual({
        error: 'Workflow not found',
      });
    });
  });

  describe('getCurrentSnapshot', () => {
    it('returns current snapshot for tenant+project', async () => {
      const mockSnapshot = {
        id: 'snapshot-123',
        tenantId: 'tenant-123',
        projectId: 'project-456',
        isCurrent: true,
        phases: [],
        progress: { totalTasks: 5, completedTasks: 2 },
      };

      mockPrisma.workflowSnapshot.findFirst.mockResolvedValue(mockSnapshot);

      const result = await getCurrentSnapshot('tenant-123', 'project-456');

      expect(result).toEqual(mockSnapshot);
      expect(mockPrisma.workflowSnapshot.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          projectId: 'project-456',
          isCurrent: true,
        },
        include: {
          phases: {
            include: {
              tasks: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
          progress: true,
        },
      });
    });
  });
});
