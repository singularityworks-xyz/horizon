import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

// Prevent Prisma / DB crashes if anything leaks
process.env.DATABASE_URL ||= 'postgresql://local/placeholder';

/* ----------------------------------
Mock auth-server (session layer)
----------------------------------- */
vi.mock('@/lib/auth-server', () => ({
  authServer: {
    requireSession: vi.fn(),
  },
}));

/* ----------------------------------
Mock RBAC (IMPORTANT: define error
class INSIDE the mock factory)
----------------------------------- */
vi.mock('@/lib/auth-rbac', () => {
  class MockRBACError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'RBACError';
      this.code = code;
    }
  }

  return {
    RBACError: MockRBACError,
    UserRole: {
      ADMIN: 'ADMIN',
      CLIENT: 'CLIENT',
    },
    rbac: {
      requireAuth: vi
        .fn()
        .mockRejectedValue(new MockRBACError('Authentication required', 'AUTH_FAILED')),
    },
  };
});

/* ----------------------------------
Imports AFTER mocks (CRITICAL)
----------------------------------- */
import { authServer } from '@/lib/auth-server';
import { guards } from '@/lib/security/guards';

/* ----------------------------------
  Test handler
----------------------------------- */
const mockHandler = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
);

describe('Asset API Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('guards.adminOnly', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(authServer.requireSession).mockRejectedValue(new Error('Authentication required'));

      const { req } = createMocks({ method: 'POST' });

      const response = await guards.adminOnly(mockHandler)(req as any);

      expect(response.status).toBe(401);
      const body = await response.json();

      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Authentication required');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('wraps a handler function correctly', () => {
      const wrapped = guards.adminOnly(mockHandler);
      expect(typeof wrapped).toBe('function');
    });
  });

  describe('Guard utilities', () => {
    it('exports all expected guards', () => {
      expect(typeof guards.adminOnly).toBe('function');
      expect(typeof guards.clientOnly).toBe('function');
      expect(typeof guards.authenticated).toBe('function');
      expect(typeof guards.adminForTenant).toBe('function');
      expect(typeof guards.clientForTenant).toBe('function');
    });

    it('creates parameterized guards', () => {
      expect(typeof guards.adminForTenant('tenant-1')).toBe('function');
      expect(typeof guards.clientForTenant('tenant-2')).toBe('function');
    });
  });
});
