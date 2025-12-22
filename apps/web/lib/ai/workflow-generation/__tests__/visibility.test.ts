import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveWorkflow,
  createAdminWorkflowQuery,
  createClientWorkflowQuery,
  getClientWorkflowWhere,
  isWorkflowVisibleToClient,
} from '../visibility';

// Mock Prisma
const mockPrisma = {
  workflow: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

// Mock snapshot creation
vi.mock('../../../workflow-snapshots/create', () => ({
  createWorkflowSnapshot: vi.fn(),
}));

import { createWorkflowSnapshot } from '../../../workflow-snapshots/create';

vi.mock('@horizon/db', () => ({
  prisma: mockPrisma,
}));

describe('Workflow Visibility Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientWorkflowWhere', () => {
    it('adds aiApprovedAt != null filter for AI workflows', () => {
      const result = getClientWorkflowWhere('tenant-123');

      expect(result).toEqual({
        tenantId: 'tenant-123',
        OR: [
          {
            source: 'AI_GENERATED',
            aiApprovedAt: { not: null },
          },
          {
            source: { not: 'AI_GENERATED' },
          },
        ],
      });
    });

    it('includes projectId filter when provided', () => {
      const result = getClientWorkflowWhere('tenant-123', 'project-456');

      expect(result.tenantId).toBe('tenant-123');
      expect(result.projectId).toBe('project-456');
      expect(result.OR).toBeDefined();
    });
  });

  describe('isWorkflowVisibleToClient', () => {
    it('returns true for manual workflows', () => {
      const workflow = {
        source: 'MANUAL',
        aiApprovedAt: null,
      };

      expect(isWorkflowVisibleToClient(workflow)).toBe(true);
    });

    it('returns false for unapproved AI workflows', () => {
      const workflow = {
        source: 'AI_GENERATED',
        aiApprovedAt: null,
      };

      expect(isWorkflowVisibleToClient(workflow)).toBe(false);
    });

    it('returns true for approved AI workflows', () => {
      const workflow = {
        source: 'AI_GENERATED',
        aiApprovedAt: new Date(),
      };

      expect(isWorkflowVisibleToClient(workflow)).toBe(true);
    });
  });

  describe('approveWorkflow', () => {
    it('approves valid AI workflow', async () => {
      const mockWorkflow = {
        source: 'AI_GENERATED',
        aiApprovedAt: null,
        tenantId: 'tenant-123',
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        aiApprovedAt: new Date(),
        aiApprovedById: 'user-456',
      });

      const result = await approveWorkflow('workflow-123', 'user-456', 'Approved for client');

      expect(result.success).toBe(true);
      expect(mockPrisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-123' },
        data: {
          aiApprovedAt: expect.any(Date),
          aiApprovedById: 'user-456',
          aiApprovalNotes: 'Approved for client',
        },
      });
    });

    it('rejects manual workflows', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({
        source: 'MANUAL',
        aiApprovedAt: null,
      });

      const result = await approveWorkflow('workflow-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only AI-generated workflows can be approved');
    });

    it('rejects already approved workflows', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({
        source: 'AI_GENERATED',
        aiApprovedAt: new Date(),
      });

      const result = await approveWorkflow('workflow-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow is already approved');
    });

    it('handles database errors', async () => {
      mockPrisma.workflow.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await approveWorkflow('workflow-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });

    it('sets workflow status to ACTIVE and triggers snapshot creation on approval', async () => {
      const mockWorkflow = {
        source: 'AI_GENERATED',
        aiApprovedAt: null,
        tenantId: 'tenant-123',
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        aiApprovedAt: expect.any(Date),
        aiApprovedById: 'user-456',
        status: 'ACTIVE',
      });

      vi.mocked(createWorkflowSnapshot).mockResolvedValue({
        snapshotId: 'snapshot-123',
      });

      const result = await approveWorkflow('workflow-123', 'user-456');

      expect(result.success).toBe(true);
      expect(mockPrisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-123' },
        data: {
          aiApprovedAt: expect.any(Date),
          aiApprovedById: 'user-456',
          aiApprovalNotes: undefined,
          status: 'ACTIVE',
          isManuallyEdited: true,
          lastEditedById: 'user-456',
          lastEditedAt: expect.any(Date),
        },
      });

      expect(createWorkflowSnapshot).toHaveBeenCalledWith('workflow-123', 'user-456');
    });

    it('continues on snapshot creation failure (non-blocking)', async () => {
      const mockWorkflow = {
        source: 'AI_GENERATED',
        aiApprovedAt: null,
        tenantId: 'tenant-123',
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        aiApprovedAt: expect.any(Date),
        aiApprovedById: 'user-456',
        status: 'ACTIVE',
      });

      vi.mocked(createWorkflowSnapshot).mockResolvedValue({
        error: 'Snapshot creation failed',
      });

      // Mock console.error to avoid test output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await approveWorkflow('workflow-123', 'user-456');

      expect(result.success).toBe(true); // Approval still succeeds
      expect(createWorkflowSnapshot).toHaveBeenCalledWith('workflow-123', 'user-456');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create snapshot after AI approval: Snapshot creation failed'
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createClientWorkflowQuery', () => {
    it('includes approval fields in client query', () => {
      const query = createClientWorkflowQuery('tenant-123', 'project-456');

      expect(query.where).toEqual(getClientWorkflowWhere('tenant-123', 'project-456'));
      expect(query.include).toHaveProperty('aiApprovedBy');
      expect(query.include).toHaveProperty('phases');
    });
  });

  describe('createAdminWorkflowQuery', () => {
    it('includes all workflow data for admin view', () => {
      const query = createAdminWorkflowQuery('tenant-123', 'project-456');

      expect(query.where.tenantId).toBe('tenant-123');
      expect(query.where.projectId).toBe('project-456');
      expect(query.include).toHaveProperty('aiWorkflowGenerations');
      expect(query.include).toHaveProperty('aiApprovedBy');
    });
  });

  describe('getClientSnapshotWhere', () => {
    it('creates where clause for current snapshots only', () => {
      const result = getClientSnapshotWhere('tenant-123');

      expect(result).toEqual({
        tenantId: 'tenant-123',
        isCurrent: true,
      });
    });

    it('includes projectId filter when provided', () => {
      const result = getClientSnapshotWhere('tenant-123', 'project-456');

      expect(result).toEqual({
        tenantId: 'tenant-123',
        projectId: 'project-456',
        isCurrent: true,
      });
    });
  });

  describe('createClientSnapshotQuery', () => {
    it('creates query for client snapshot access', () => {
      const query = createClientSnapshotQuery('tenant-123', 'project-456');

      expect(query.where).toEqual({
        tenantId: 'tenant-123',
        projectId: 'project-456',
        isCurrent: true,
      });

      expect(query.include).toHaveProperty('project');
      expect(query.include).toHaveProperty('phases');
      expect(query.include).toHaveProperty('progress');
      expect(query.include).toHaveProperty('workflow');

      // Verify phases include tasks
      expect(query.include.phases.include).toHaveProperty('tasks');
      expect(query.include.phases.include.tasks.orderBy).toEqual({
        order: 'asc',
      });
    });

    it('works without projectId filter', () => {
      const query = createClientSnapshotQuery('tenant-123');

      expect(query.where).toEqual({
        tenantId: 'tenant-123',
        isCurrent: true,
      });
      expect(query.where.projectId).toBeUndefined();
    });
  });
});
