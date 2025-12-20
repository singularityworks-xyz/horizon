// Database-backed rate limiter for AI usage
// Uses Prisma to track and enforce per-tenant rate limits

import { prisma } from '@horizon/db';
import { AiError } from '../errors';

export interface RateLimitConfig {
  tenantId: string;
  scope: string;
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  resetIn: number; // Milliseconds until reset
  limit: number;
}

export class DbRateLimiter {
  // Default rate limits (configurable via env in the future)
  private static readonly DEFAULTS = {
    perMinute: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 requests per minute
    perHour: { maxRequests: 500, windowMs: 60 * 60 * 1000 }, // 500 requests per hour
    perDay: { maxRequests: 2000, windowMs: 24 * 60 * 60 * 1000 }, // 2000 requests per day
  };

  // Available windows
  private static readonly WINDOWS = [
    { name: 'minute', config: this.DEFAULTS.perMinute },
    { name: 'hour', config: this.DEFAULTS.perHour },
    { name: 'day', config: this.DEFAULTS.perDay },
  ] as const;

  /**
   * Check and consume a rate limit token for the given tenant and scope
   * Atomically checks all applicable windows and consumes tokens only if all pass
   */
  async checkAndConsume(tenantId: string, scope: string): Promise<RateLimitResult> {
    const now = new Date();
    const windows = DbRateLimiter.WINDOWS;

    // Phase 1: Check all windows without consuming tokens
    const windowResults: Array<{
      window: string;
      config: { maxRequests: number; windowMs: number };
      currentCount: number;
      resetIn: number;
    }> = [];

    let mostRestrictiveResult: RateLimitResult | null = null;

    for (const { name: windowName, config } of windows) {
      const windowStart = this.getWindowStart(now, config.windowMs);

      const existing = await prisma.aiRateLimit.findUnique({
        where: {
          tenantId_scope_window_windowStart: {
            tenantId,
            scope,
            window: windowName,
            windowStart,
          },
        },
      });

      const currentCount = existing?.count ?? 0;
      const resetIn = config.windowMs - (now.getTime() - windowStart.getTime());

      const result: RateLimitResult = {
        allowed: currentCount < config.maxRequests,
        currentCount,
        resetIn: Math.max(0, resetIn),
        limit: config.maxRequests,
      };

      windowResults.push({
        window: windowName,
        config,
        currentCount,
        resetIn: result.resetIn,
      });

      // Track the most restrictive result (shortest reset time)
      if (
        !result.allowed &&
        (!mostRestrictiveResult || result.resetIn < mostRestrictiveResult.resetIn)
      ) {
        mostRestrictiveResult = result;
      }
    }

    // If any window is over limit, return the most restrictive failure
    if (mostRestrictiveResult) {
      return mostRestrictiveResult;
    }

    // Phase 2: All windows passed - consume tokens atomically
    await this.consumeTokensAtomic(tenantId, scope, windowResults);

    // Return the most restrictive success result (shortest reset time)
    const successResults = windowResults.map((r) => ({
      allowed: true,
      currentCount: r.currentCount + 1, // Will be incremented
      resetIn: r.resetIn,
      limit: r.config.maxRequests,
    }));

    return successResults.reduce((mostRestrictive, current) =>
      current.resetIn < mostRestrictive.resetIn ? current : mostRestrictive
    );
  }

  private async checkSingleLimit(
    tenantId: string,
    scope: string,
    config: { maxRequests: number; windowMs: number; window: string }
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = this.getWindowStart(now, config.windowMs);

    // Check current count in this window
    const existing = await prisma.aiRateLimit.findUnique({
      where: {
        tenantId_scope_window_windowStart: {
          tenantId,
          scope,
          window: config.window,
          windowStart,
        },
      },
    });

    const currentCount = existing?.count ?? 0;
    const resetIn = config.windowMs - (now.getTime() - windowStart.getTime());

    return {
      allowed: currentCount < config.maxRequests,
      currentCount,
      resetIn: Math.max(0, resetIn),
      limit: config.maxRequests,
    };
  }

  private async consumeTokensAtomic(
    tenantId: string,
    scope: string,
    windowResults: Array<{
      window: string;
      config: { maxRequests: number; windowMs: number };
      currentCount: number;
      resetIn: number;
    }>
  ): Promise<void> {
    const now = new Date();

    // Use a transaction to atomically update all windows
    await prisma.$transaction(async (tx) => {
      for (const windowResult of windowResults) {
        const windowStart = this.getWindowStart(now, windowResult.config.windowMs);

        await tx.aiRateLimit.upsert({
          where: {
            tenantId_scope_window_windowStart: {
              tenantId,
              scope,
              window: windowResult.window,
              windowStart,
            },
          },
          update: {
            count: { increment: 1 },
            updatedAt: now,
          },
          create: {
            tenantId,
            scope,
            window: windowResult.window,
            windowStart,
            count: 1,
          },
        });
      }
    });
  }

  /**
   * Calculate the start of the current window for a given timestamp and window size
   * Uses floor division to align windows to exact boundaries
   */
  private getWindowStart(now: Date, windowMs: number): Date {
    // Align to window boundaries by flooring the timestamp
    const windowStartMs = Math.floor(now.getTime() / windowMs) * windowMs;
    return new Date(windowStartMs);
  }

  /**
   * Get current rate limit status for a tenant/scope without consuming tokens
   */
  async getStatus(tenantId: string, scope: string): Promise<RateLimitResult> {
    const config = this.constructor.DEFAULTS.perMinute;
    return this.checkSingleLimit(tenantId, scope, {
      ...config,
      window: 'minute',
    });
  }
}

// Export singleton instance
export const rateLimiter = new DbRateLimiter();
