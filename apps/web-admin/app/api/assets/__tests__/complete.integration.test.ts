import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { handleComplete, type AssetContext } from '../complete/route';
import { prisma } from '@horizon/db';

// Mock dependencies
vi.mock('@horizon/db', () => ({
  prisma: {
    asset: { create: vi.fn() },
    assetVersion: { create: vi.fn() },
    project: { findFirst: vi.fn() },
    question: { findFirst: vi.fn() },
    answer: { findFirst: vi.fn() },
    workflow: { findFirst: vi.fn() },
    phase: { findFirst: vi.fn() },
    task: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/storage/r2', () => ({
  createPresignedDownloadUrl: vi.fn(),
  validateStorageConfig: vi.fn(),
}));

vi.mock('@/lib/assets/virus-scan', () => ({
  scanForViruses: vi.fn(),
  validateScanResult: vi.fn(),
}));

import { createPresignedDownloadUrl, validateStorageConfig } from '@/lib/storage/r2';
import { scanForViruses, validateScanResult } from '@/lib/assets/virus-scan';

// Mock context for testing
const mockContext: AssetContext = {
  tenantId: 'tenant-123',
  userId: 'user-123',
  role: 'admin',
};

describe('/api/assets/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateStorageConfig).mockReturnValue(true);
  });

  describe('handleComplete', () => {
    it('should return 400 for invalid request data', async () => {
      const { req } = createMocks({
        method: 'POST',
        json: () => Promise.resolve({ invalid: 'data' }),
      });

      const response = await handleComplete(req as any, mockContext);

      expect(response.status).toBe(400);
    });

    it('should return 400 for failed virus scan', async () => {
      vi.mocked(validateScanResult).mockReturnValue(false);
      vi.mocked(scanForViruses).mockResolvedValue({
        isClean: false,
        scanId: 'scan-123',
        scannedAt: new Date().toISOString(),
      });

      const { req } = createMocks({
        method: 'POST',
        json: () =>
          Promise.resolve({
            assetId: 'ckasset1234567890exampleid1',
            storageKey: 'tenants/tenant-123/assets/ckasset1234567890exampleid1/test.pdf',
            checksum: 'abc123',
            virusScanResult: {
              isClean: true,
              scanId: 'scan-123',
              scannedAt: new Date().toISOString(),
            },
            presignData: {
              fileName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 1024,
              projectId: 'ckproject1234567890example1',
            },
          }),
      });

      const response = await handleComplete(req as any, mockContext);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('failed security scan');
    });

    it('should return 403 for tenant mismatch', async () => {
      vi.mocked(validateScanResult).mockReturnValue(true);
      vi.mocked(scanForViruses).mockResolvedValue({
        isClean: true,
        scanId: 'scan-123',
        scannedAt: new Date().toISOString(),
      });

      const { req } = createMocks({
        method: 'POST',
        json: () =>
          Promise.resolve({
            assetId: 'ckasset1234567890exampleid2',
            storageKey: 'tenants/wrong-tenant/assets/ckasset1234567890exampleid2/test.pdf', // Wrong tenant
            checksum: 'abc123',
            virusScanResult: {
              isClean: true,
              scanId: 'scan-123',
              scannedAt: new Date().toISOString(),
            },
            presignData: {
              fileName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 1024,
              projectId: 'ckproject1234567890example2',
            },
          }),
      });

      const response = await handleComplete(req as any, mockContext);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toContain('does not belong to this tenant');
    });

    it('should create asset successfully', async () => {
      vi.mocked(validateScanResult).mockReturnValue(true);
      vi.mocked(scanForViruses).mockResolvedValue({
        isClean: true,
        scanId: 'scan-123',
        scannedAt: new Date().toISOString(),
      });
      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'ckproject1234567890example3',
      } as any);
      vi.mocked(prisma.asset.create).mockResolvedValue({
        id: 'ckasset1234567890exampleid3',
        tenantId: 'tenant-123',
        uploaderId: 'user-123',
        name: 'test.pdf',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        checksum: 'abc123',
        storageKey: 'tenants/tenant-123/assets/ckasset1234567890exampleid3/test.pdf',
        accessLevel: 'TENANT',
        projectId: 'ckproject1234567890example3',
        project: { id: 'ckproject1234567890example3', name: 'Test Project' },
        uploader: { id: 'user-123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      } as any);
      vi.mocked(prisma.assetVersion.create).mockResolvedValue({} as any);
      vi.mocked(createPresignedDownloadUrl).mockResolvedValue('https://download-url.com');

      const { req } = createMocks({
        method: 'POST',
        json: () =>
          Promise.resolve({
            assetId: 'ckasset1234567890exampleid3',
            storageKey: 'tenants/tenant-123/assets/ckasset1234567890exampleid3/test.pdf',
            checksum: 'abc123',
            virusScanResult: {
              isClean: true,
              scanId: 'scan-123',
              scannedAt: new Date().toISOString(),
            },
            presignData: {
              fileName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 1024,
              projectId: 'ckproject1234567890example3',
            },
          }),
      });

      const response = await handleComplete(req as any, mockContext);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('asset');
      expect(data).toHaveProperty('downloadUrl');
      expect(data).toHaveProperty('expiresAt');
      expect(data.asset.id).toBe('ckasset1234567890exampleid3');
    });
  });
});
