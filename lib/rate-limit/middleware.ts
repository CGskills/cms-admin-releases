import 'server-only';

import { headers } from 'next/headers';
import { RateLimitError } from '@/lib/errors';

/**
 * In-memory rate limiter.
 * Tracks request counts per identifier within a time window.
 */
class RateLimiter {
  private limits = new Map<string, { count: number; resetAt: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request is allowed within rate limits.
   *
   * @param identifier - Unique identifier (e.g., IP address)
   * @param maxRequests - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if allowed, false if rate limit exceeded
   */
  check(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const limit = this.limits.get(identifier);

    // No previous requests or window expired
    if (!limit || limit.resetAt < now) {
      this.limits.set(identifier, { count: 1, resetAt: now + windowMs });
      return true;
    }

    // Rate limit exceeded
    if (limit.count >= maxRequests) {
      return false;
    }

    // Increment counter
    limit.count++;
    return true;
  }

  /**
   * Remove expired entries to prevent memory leak.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.limits.entries()) {
      if (value.resetAt < now) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Clear all rate limit data (for testing).
   */
  clear(): void {
    this.limits.clear();
  }

  /**
   * Stop cleanup interval (for testing/shutdown).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Get client identifier from request headers.
 * Uses X-Forwarded-For or X-Real-IP in production, fallback to 'unknown'.
 */
async function getClientIdentifier(): Promise<string> {
  const headersList = await headers();

  // Try X-Forwarded-For first (proxy/load balancer)
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP from the list
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  // Try X-Real-IP
  const realIp = headersList.get('x-real-ip');
  if (realIp) return realIp.trim();

  // Fallback for development/desktop app
  return 'unknown';
}

/**
 * Check rate limit and throw error if exceeded.
 *
 * @param maxRequests - Maximum requests allowed (default: 10)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @throws {RateLimitError} If rate limit exceeded
 */
export async function requireRateLimit(
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<void> {
  const identifier = await getClientIdentifier();
  const allowed = rateLimiter.check(identifier, maxRequests, windowMs);

  if (!allowed) {
    throw new RateLimitError('Too many requests. Please try again later.');
  }
}

/**
 * Check rate limit without throwing (for testing).
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  return rateLimiter.check(identifier, maxRequests, windowMs);
}

/**
 * Clear all rate limit data (for testing).
 */
export function clearRateLimits(): void {
  rateLimiter.clear();
}

/**
 * Destroy rate limiter (for testing/shutdown).
 */
export function destroyRateLimiter(): void {
  rateLimiter.destroy();
}
