import { NextRequest, NextResponse } from 'next/server';

/**
 * SECURITY: Rate Limiting Middleware
 *
 * Prevents brute force attacks on authentication endpoints by limiting
 * the number of requests from a single IP address.
 *
 * This is a simple in-memory implementation. For production with multiple
 * instances, use Redis with @upstash/ratelimit or similar.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Prefix for the rate limit key
}

/**
 * Get client identifier (IP address or fallback)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (set by reverse proxy/CDN)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}

/**
 * Rate limit middleware
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns Response if rate limit exceeded, null otherwise
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const clientId = getClientIdentifier(request);
  const key = `${config.keyPrefix}:${clientId}`;
  const now = Date.now();

  // Get or create record
  let record = rateLimitStore.get(key);

  if (!record || record.resetAt < now) {
    // Create new record
    record = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, record);
    return null; // Allow request
  }

  // Increment counter
  record.count++;

  if (record.count > config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);

    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(record.resetAt / 1000).toString(),
        },
      }
    );
  }

  // Allow request
  return null;
}

/**
 * Pre-configured rate limiters for common auth endpoints
 */
export const authRateLimiters = {
  /**
   * Sign-in rate limiter: 5 attempts per 15 minutes
   * Prevents brute force password attacks
   */
  signIn: (request: NextRequest) =>
    rateLimit(request, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      keyPrefix: 'auth:signin',
    }),

  /**
   * Sign-up rate limiter: 3 attempts per hour
   * Prevents automated account creation spam
   */
  signUp: (request: NextRequest) =>
    rateLimit(request, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      keyPrefix: 'auth:signup',
    }),

  /**
   * Password reset rate limiter: 3 attempts per hour
   * Prevents abuse of password reset functionality
   */
  forgotPassword: (request: NextRequest) =>
    rateLimit(request, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      keyPrefix: 'auth:forgot-password',
    }),

  /**
   * Email verification rate limiter: 5 attempts per hour
   * Prevents abuse of verification email sending
   */
  verifyEmail: (request: NextRequest) =>
    rateLimit(request, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
      keyPrefix: 'auth:verify-email',
    }),
};

/**
 * Generic API rate limiter: 100 requests per minute
 * Protects general API endpoints from abuse
 */
export const apiRateLimit = (request: NextRequest) =>
  rateLimit(request, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'api:general',
  });
