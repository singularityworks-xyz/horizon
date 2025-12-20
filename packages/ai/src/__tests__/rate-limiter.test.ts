import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DbRateLimiter } from '../rate-limit/db-rate-limiter';

// Mock Prisma
const mockPrisma = {
  aiRateLimit: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@horizon/db', () => ({
  prisma: mockPrisma,
}));

describe('DbRateLimiter', () => {
  let rateLimiter: DbRateLimiter;

  beforeEach(() => {
    rateLimiter = new DbRateLimiter();
    vi.clearAllMocks();
  });

  describe('checkAndConsume', () => {
    it('should allow request when under limit', async () => {
      // Mock no existing rate limit record (first request)
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue(null);

      // Mock successful upsert
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      const result = await rateLimiter.checkAndConsume('tenant-1', 'ai.test');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0); // No previous requests
      expect(result.limit).toBeGreaterThan(0);
    });

    it('should block request when over limit', async () => {
      // Mock existing rate limit at limit
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue({
        count: 60, // At per-minute limit
        windowStart: new Date(),
      });

      const result = await rateLimiter.checkAndConsume('tenant-1', 'ai.test');

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(60);
    });
  });

  describe('getStatus', () => {
    it('should return current status without consuming', async () => {
      mockPrisma.aiRateLimit.findUnique.mockResolvedValue({
        count: 5,
        windowStart: new Date(),
      });

      const result = await rateLimiter.getStatus('tenant-1', 'ai.test');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(5);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
