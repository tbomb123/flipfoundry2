/**
 * Tests for lib/rate-limit.ts
 * Tests the in-memory fallback rate limiter and response helpers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock upstash modules before importing
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn(),
  })),
}));

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn() },
}));

vi.mock('../redis', () => ({
  isRedisConfigured: vi.fn(() => false),
}));

import { checkRateLimit, createRateLimitResponse, getClientIdentifier } from '../rate-limit';
import { NextRequest } from 'next/server';

function mockRequest(ip = '192.168.1.1'): NextRequest {
  return new NextRequest('http://localhost:3000/api/search', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip, 'content-type': 'application/json' },
  });
}

describe('rate-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientIdentifier', () => {
    it('extracts IP from x-forwarded-for', () => {
      const req = mockRequest('10.0.0.1');
      expect(getClientIdentifier(req)).toBe('10.0.0.1');
    });

    it('handles multiple forwarded IPs (takes first)', () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' },
      });
      expect(getClientIdentifier(req)).toBe('10.0.0.1');
    });

    it('falls back to x-real-ip', () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': '172.16.0.1' },
      });
      expect(getClientIdentifier(req)).toBe('172.16.0.1');
    });

    it('returns unknown when no IP headers present', () => {
      const req = new NextRequest('http://localhost/api/test');
      expect(getClientIdentifier(req)).toBe('unknown');
    });
  });

  describe('checkRateLimit (in-memory fallback)', () => {
    it('allows requests within limit', async () => {
      const req = mockRequest('test-allow-ip');
      const result = await checkRateLimit(req, { maxRequests: 5, windowMs: 60000 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it('blocks requests after limit exceeded', async () => {
      const ip = 'test-block-ip-' + Date.now();
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(mockRequest(ip), { maxRequests: 3, windowMs: 60000 });
      }
      const result = await checkRateLimit(mockRequest(ip), { maxRequests: 3, windowMs: 60000 });
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('decrements remaining count correctly', async () => {
      const ip = 'test-decrement-ip-' + Date.now();
      const r1 = await checkRateLimit(mockRequest(ip), { maxRequests: 5, windowMs: 60000 });
      expect(r1.remaining).toBe(4);
      const r2 = await checkRateLimit(mockRequest(ip), { maxRequests: 5, windowMs: 60000 });
      expect(r2.remaining).toBe(3);
    });

    it('uses default config when none provided', async () => {
      const req = mockRequest('test-default-ip-' + Date.now());
      const result = await checkRateLimit(req);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(20);
    });
  });

  describe('createRateLimitResponse', () => {
    it('returns 429 with correct headers', () => {
      const result = {
        success: false,
        limit: 20,
        remaining: 0,
        reset: Date.now() + 60000,
        retryAfter: 60,
      };
      const response = createRateLimitResponse(result);
      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('20');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('includes correct JSON body', async () => {
      const result = {
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 30000,
        retryAfter: 30,
      };
      const response = createRateLimitResponse(result);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.retryAfter).toBe(30);
    });
  });
});
