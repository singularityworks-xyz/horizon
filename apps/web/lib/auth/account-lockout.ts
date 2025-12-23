import { prisma } from '@horizon/db';
import { auditLog } from '@/lib/audit/logger';

/**
 * SECURITY: Account Lockout Protection
 *
 * Prevents brute force attacks by locking accounts after failed login attempts.
 *
 * Features:
 * - Lock account after configurable number of failed attempts
 * - Auto-unlock after configurable time period
 * - Manual unlock via email verification
 * - Audit logging of all lockout events
 */

interface LockoutConfig {
  maxAttempts: number; // Max failed attempts before lockout
  lockoutDurationMs: number; // How long to lock the account
  attemptWindowMs: number; // Time window to count attempts
}

const DEFAULT_LOCKOUT_CONFIG: LockoutConfig = {
  maxAttempts: 5,
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
  attemptWindowMs: 15 * 60 * 1000, // 15 minutes
};

interface FailedAttempt {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

// In-memory store (use Redis in production for distributed systems)
const failedAttemptsStore = new Map<string, FailedAttempt>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of failedAttemptsStore.entries()) {
      if (record.lockedUntil && record.lockedUntil < now) {
        failedAttemptsStore.delete(key);
      } else if (record.firstAttemptAt + DEFAULT_LOCKOUT_CONFIG.attemptWindowMs < now) {
        failedAttemptsStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

/**
 * Check if an account is locked
 */
export async function isAccountLocked(identifier: string): Promise<boolean> {
  const record = failedAttemptsStore.get(identifier);

  if (!record?.lockedUntil) {
    return false;
  }

  const now = Date.now();
  if (record.lockedUntil > now) {
    return true;
  }

  // Lock expired, clean up
  failedAttemptsStore.delete(identifier);
  return false;
}

/**
 * Get remaining lockout time in seconds
 */
export async function getRemainingLockoutTime(identifier: string): Promise<number> {
  const record = failedAttemptsStore.get(identifier);

  if (!record?.lockedUntil) {
    return 0;
  }

  const now = Date.now();
  const remaining = Math.ceil((record.lockedUntil - now) / 1000);

  return Math.max(0, remaining);
}

/**
 * Record a failed login attempt
 * Returns true if account should be locked
 */
export async function recordFailedAttempt(
  identifier: string,
  config: LockoutConfig = DEFAULT_LOCKOUT_CONFIG
): Promise<{ locked: boolean; remainingAttempts: number }> {
  const now = Date.now();
  let record = failedAttemptsStore.get(identifier);

  if (!record) {
    // First failed attempt
    record = {
      count: 1,
      firstAttemptAt: now,
    };
    failedAttemptsStore.set(identifier, record);

    return {
      locked: false,
      remainingAttempts: config.maxAttempts - 1,
    };
  }

  // Check if we're still in the attempt window
  if (now - record.firstAttemptAt > config.attemptWindowMs) {
    // Window expired, reset counter
    record.count = 1;
    record.firstAttemptAt = now;
    delete record.lockedUntil;

    return {
      locked: false,
      remainingAttempts: config.maxAttempts - 1,
    };
  }

  // Increment attempt counter
  record.count++;

  // Check if we should lock the account
  if (record.count >= config.maxAttempts) {
    record.lockedUntil = now + config.lockoutDurationMs;

    // Log the lockout
    await auditLog.accountLocked(identifier, `Too many failed login attempts (${record.count})`);

    // TODO: Send email notification to user
    // await sendAccountLockedEmail(identifier, record.lockedUntil);

    return {
      locked: true,
      remainingAttempts: 0,
    };
  }

  return {
    locked: false,
    remainingAttempts: config.maxAttempts - record.count,
  };
}

/**
 * Clear failed attempts after successful login
 */
export async function clearFailedAttempts(identifier: string): Promise<void> {
  failedAttemptsStore.delete(identifier);
}

/**
 * Manually unlock an account (e.g., after email verification)
 */
export async function unlockAccount(identifier: string, unlockedBy: string): Promise<void> {
  failedAttemptsStore.delete(identifier);

  // Log the unlock
  await auditLog.suspiciousActivity(null, `Account manually unlocked: ${identifier}`, undefined, {
    unlockedBy,
  });
}

/**
 * Get account lockout status
 */
export async function getAccountLockoutStatus(identifier: string): Promise<{
  isLocked: boolean;
  failedAttempts: number;
  remainingAttempts: number;
  lockedUntil?: Date;
  remainingLockoutSeconds?: number;
}> {
  const record = failedAttemptsStore.get(identifier);
  const config = DEFAULT_LOCKOUT_CONFIG;

  if (!record) {
    return {
      isLocked: false,
      failedAttempts: 0,
      remainingAttempts: config.maxAttempts,
    };
  }

  const now = Date.now();
  const isLocked = record.lockedUntil ? record.lockedUntil > now : false;

  return {
    isLocked,
    failedAttempts: record.count,
    remainingAttempts: Math.max(0, config.maxAttempts - record.count),
    lockedUntil: record.lockedUntil ? new Date(record.lockedUntil) : undefined,
    remainingLockoutSeconds: record.lockedUntil
      ? Math.ceil((record.lockedUntil - now) / 1000)
      : undefined,
  };
}

/**
 * Middleware to check account lockout before authentication
 */
export async function checkAccountLockout(
  identifier: string
): Promise<{ allowed: boolean; error?: string; remainingSeconds?: number }> {
  const locked = await isAccountLocked(identifier);

  if (locked) {
    const remainingSeconds = await getRemainingLockoutTime(identifier);

    return {
      allowed: false,
      error: `Account locked due to too many failed login attempts. Try again in ${Math.ceil(remainingSeconds / 60)} minutes.`,
      remainingSeconds,
    };
  }

  return { allowed: true };
}
