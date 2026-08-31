import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock server-only and Next.js headers
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => ({
    get: () => null
  })
}));

import { checkRateLimit, clearRateLimits } from '@/lib/rate-limit/middleware';

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it('should allow requests within limit', async () => {
    const identifier = 'test-ip-1';
    const maxRequests = 5;
    const windowMs = 60000;

    // First 5 requests should be allowed
    for (let i = 0; i < maxRequests; i++) {
      const allowed = await checkRateLimit(identifier, maxRequests, windowMs);
      expect(allowed).toBe(true);
    }
  });

  it('should block requests exceeding limit', async () => {
    const identifier = 'test-ip-2';
    const maxRequests = 3;
    const windowMs = 60000;

    // First 3 requests allowed
    for (let i = 0; i < maxRequests; i++) {
      const allowed = await checkRateLimit(identifier, maxRequests, windowMs);
      expect(allowed).toBe(true);
    }

    // 4th request should be blocked
    const blocked = await checkRateLimit(identifier, maxRequests, windowMs);
    expect(blocked).toBe(false);
  });

  it('should reset counter after window expires', async () => {
    const identifier = 'test-ip-3';
    const maxRequests = 2;
    const windowMs = 100; // Short window for testing

    // Use up the limit
    await checkRateLimit(identifier, maxRequests, windowMs);
    await checkRateLimit(identifier, maxRequests, windowMs);

    // Should be blocked
    const blocked = await checkRateLimit(identifier, maxRequests, windowMs);
    expect(blocked).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be allowed again
    const allowed = await checkRateLimit(identifier, maxRequests, windowMs);
    expect(allowed).toBe(true);
  });

  it('should track different identifiers separately', async () => {
    const maxRequests = 2;
    const windowMs = 60000;

    // Use up limit for identifier 1
    await checkRateLimit('ip-1', maxRequests, windowMs);
    await checkRateLimit('ip-1', maxRequests, windowMs);

    // Identifier 1 should be blocked
    const blocked = await checkRateLimit('ip-1', maxRequests, windowMs);
    expect(blocked).toBe(false);

    // Identifier 2 should still be allowed
    const allowed = await checkRateLimit('ip-2', maxRequests, windowMs);
    expect(allowed).toBe(true);
  });
});
