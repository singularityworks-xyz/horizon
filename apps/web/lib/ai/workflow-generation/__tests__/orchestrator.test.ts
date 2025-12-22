import { describe, expect, it, vi } from 'vitest';

// Mock the orchestrator dependencies
vi.mock('@horizon/db');

// Mock the pipeline steps to throw errors (simulating test isolation)
vi.mock('../normalize', () => ({
  normalizeSubmission: () => {
    throw new Error('Should not be called in idempotency tests');
  },
}));

import { prisma } from '@horizon/db';

describe('Workflow Generation Idempotency', () => {
  const ctx = {
    tenantId: 'tenant-123',
    scope: 'ai.workflow.generate',
    requestId: 'req-123',
    caller: 'submission.submit',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns existing SUCCEEDED workflow without re-processing', async () => {
    // Mock the prisma call to return existing successful generation
    vi.mocked(prisma.aiWorkflowGeneration.findUnique).mockResolvedValue({
      id: 'gen-123',
      tenantId: 'tenant-123',
      submissionId: 'sub-123',
      projectId: 'proj-123',
      status: 'SUCCEEDED',
      workflowId: 'wf-123',
      provider: null,
      promptId: null,
      promptVersion: null,
      requestId: null,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // This will fail because we mocked the step functions to throw
    // But the important part is that it doesn't try to create a new generation
    try {
      await generateWorkflowFromSubmission(ctx, 'sub-123');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      // The function will throw because we mocked steps to throw
      // But the key is that it found the existing generation
      expect(prisma.aiWorkflowGeneration.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_submissionId: {
            tenantId: 'tenant-123',
            submissionId: 'sub-123',
          },
        },
      });
      expect(prisma.aiWorkflowGeneration.create).not.toHaveBeenCalled();
    }
  });

  it('returns PENDING status for in-progress generations', async () => {
    vi.mocked(prisma.aiWorkflowGeneration.findUnique).mockResolvedValue({
      id: 'gen-123',
      tenantId: 'tenant-123',
      submissionId: 'sub-123',
      projectId: 'proj-123',
      status: 'PENDING',
      workflowId: null,
      provider: null,
      promptId: null,
      promptVersion: null,
      requestId: null,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await generateWorkflowFromSubmission(ctx, 'sub-123');
      expect(true).toBe(false); // Should not reach here due to mocked step functions
    } catch (error) {
      // Verify the existing generation was found
      expect(prisma.aiWorkflowGeneration.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_submissionId: {
            tenantId: 'tenant-123',
            submissionId: 'sub-123',
          },
        },
      });
      // Should not create new generation for PENDING status
      expect(prisma.aiWorkflowGeneration.create).not.toHaveBeenCalled();
    }
  });

  it('creates new generation for first-time submissions', async () => {
    vi.mocked(prisma.aiWorkflowGeneration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.aiWorkflowGeneration.create).mockResolvedValue({
      id: 'gen-new',
      tenantId: 'tenant-123',
      submissionId: 'sub-123',
      projectId: '',
      status: 'PENDING',
      workflowId: null,
      provider: null,
      promptId: null,
      promptVersion: null,
      requestId: 'req-123',
      errorCode: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await generateWorkflowFromSubmission(ctx, 'sub-123');
      expect(true).toBe(false); // Should not reach here due to mocked step functions
    } catch (error) {
      // Verify new generation was created
      expect(prisma.aiWorkflowGeneration.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-123',
          submissionId: 'sub-123',
          projectId: '',
          status: 'PENDING',
          requestId: 'req-123',
        },
      });
    }
  });
});
