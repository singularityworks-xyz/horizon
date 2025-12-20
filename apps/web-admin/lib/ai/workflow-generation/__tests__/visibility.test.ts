import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getClientWorkflowWhere,
  createClientWorkflowQuery,
  createAdminWorkflowQuery,
  isWorkflowVisibleToClient,
  approveWorkflow,
} from '../visibility';

// Mock Prisma
const mockPrisma = {
  workflow: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

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
});
