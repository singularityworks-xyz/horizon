import { prisma } from '@horizon/db';
import { createMocks } from 'node-mocks-http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AssetContext, handlePresign } from '../presign/route';

vi.mock('@horizon/db', () => ({
  prisma: {
    project: { findFirst: vi.fn() },
    question: { findFirst: vi.fn() },
    answer: { findFirst: vi.fn() },
    workflow: { findFirst: vi.fn() },
    phase: { findFirst: vi.fn() },
    task: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/storage/r2', () => ({
  createPresignedUploadUrl: vi.fn(),
  validateStorageConfig: vi.fn(),
  generateStorageKey: vi.fn(),
}));

import {
  createPresignedUploadUrl,
  generateStorageKey,
  validateStorageConfig,
} from '@/lib/storage/r2';

const mockContext: AssetContext = {
  tenantId: 'tenant-123',
  userId: 'user-123',
  role: 'admin',
};

const base = { createdAt: new Date(), updatedAt: new Date() };

describe('/api/assets/presign', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(validateStorageConfig).mockReturnValue(true);
    vi.mocked(generateStorageKey).mockReturnValue(
      'tenants/tenant-123/assets/ckasset1234567890example/test.pdf'
    );

    vi.mocked(prisma.project.findFirst).mockResolvedValue({
      id: 'ckproject1234567890example',
      tenantId: mockContext.tenantId,
      ...base,
    } as any);
  });

  it('returns 400 for invalid request body', async () => {
    const { req } = createMocks({
      method: 'POST',
      json: async () => ({ invalid: true }),
    });

    const res = await handlePresign(req as any, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 for unsupported file type', async () => {
    const { req } = createMocks({
      method: 'POST',
      json: async () => ({
        fileName: 'bad.exe',
        mimeType: 'application/x-msdownload',
        size: 1024,
        projectId: 'project-123',
      }),
    });

    const res = await handlePresign(req as any, mockContext);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.message).toBe('Invalid request data');
  });

  it('returns 400 when file exceeds size limit', async () => {
    const { req } = createMocks({
      method: 'POST',
      json: async () => ({
        fileName: 'big.pdf',
        mimeType: 'application/pdf',
        size: 100 * 1024 * 1024,
        projectId: 'project-123',
      }),
    });

    const res = await handlePresign(req as any, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when project does not belong to tenant', async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValueOnce({
      id: 'project-123',
      tenantId: 'other-tenant',
    } as any);

    const { req } = createMocks({
      method: 'POST',
      json: async () => ({
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        projectId: 'project-123',
      }),
    });

    const res = await handlePresign(req as any, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns presign data for valid request', async () => {
    vi.mocked(createPresignedUploadUrl).mockResolvedValue('https://upload.example.com');

    const { req } = createMocks({
      method: 'POST',
      json: async () => ({
        fileName: 'ok.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        projectId: 'ckproject1234567890example',
      }),
    });

    const res = await handlePresign(req as any, mockContext);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.uploadUrl).toBeDefined();
    expect(body.storageKey).toBeDefined();
    expect(body.expiresAt).toBeDefined();
  });
});
