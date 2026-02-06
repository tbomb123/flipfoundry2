/**
 * Tests for API route handlers
 * Tests /api/health, /api/search, /api/search/status
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock rate limit to always allow
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ success: true, limit: 20, remaining: 19, reset: Date.now() + 300000 })),
  createRateLimitResponse: vi.fn(),
}));

// Mock cache
vi.mock('@/lib/cache', () => ({
  getCachedSearch: vi.fn(() => Promise.resolve(null)),
  setCachedSearch: vi.fn(),
  getCachedComparables: vi.fn(() => Promise.resolve(null)),
  setCachedComparables: vi.fn(),
}));

// Mock eBay
vi.mock('@/lib/ebay-server', () => ({
  isEbayConfigured: vi.fn(() => false),
  getEbayStatus: vi.fn(() => ({ configured: false, sandbox: false, message: 'eBay API not configured' })),
  searchListings: vi.fn(),
  getSoldComparables: vi.fn(),
}));

// Mock validation (pass-through)
vi.mock('@/lib/validation', () => ({
  SearchParamsSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.keywords || (typeof data.keywords === 'string' && data.keywords.trim() === '')) {
        return { success: false, error: { issues: [{ code: 'too_small', path: ['keywords'], message: 'Keywords are required' }] } };
      }
      return { success: true, data };
    }),
  },
  ComparablesParamsSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.keywords) {
        return { success: false, error: { issues: [{ path: ['keywords'], message: 'required' }] } };
      }
      return { success: true, data };
    }),
  },
  sanitizeKeywords: vi.fn((k: string) => k),
  validatePriceRange: vi.fn(() => ({ valid: true })),
}));

import { GET as healthGET } from '../../app/api/health/route';
import { GET as statusGET } from '../../app/api/search/status/route';
import { POST as searchPOST } from '../../app/api/search/route';
import { POST as comparablesPOST } from '../../app/api/search/comparables/route';
import { NextRequest } from 'next/server';

function mockNextRequest(body?: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('API Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await healthGET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.version).toBe('1.0.0');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/search/status', () => {
    it('returns eBay config status', async () => {
      const req = new NextRequest('http://localhost/api/search/status', {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });
      const res = await statusGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.configured).toBe(false);
    });
  });

  describe('POST /api/search', () => {
    it('returns 503 when eBay not configured', async () => {
      const req = mockNextRequest({ keywords: 'laptop' });
      const res = await searchPOST(req);
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('returns 400 for invalid/empty keywords', async () => {
      const req = mockNextRequest({ keywords: '' });
      const res = await searchPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid JSON', async () => {
      const req = new NextRequest('http://localhost/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
        body: 'not-json',
      });
      const res = await searchPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('INVALID_JSON');
    });

    it('returns results when eBay is configured', async () => {
      const { isEbayConfigured, searchListings } = await import('@/lib/ebay-server');
      vi.mocked(isEbayConfigured).mockReturnValue(true);
      vi.mocked(searchListings).mockResolvedValueOnce({ listings: [], total: 0, hasMore: false });

      const req = mockNextRequest({ keywords: 'laptop', minPrice: 50 });
      const res = await searchPOST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });

  describe('POST /api/search/comparables', () => {
    it('returns 503 when eBay not configured', async () => {
      const { isEbayConfigured } = await import('@/lib/ebay-server');
      const { getCachedComparables } = await import('@/lib/cache');
      vi.mocked(isEbayConfigured).mockReturnValue(false);
      vi.mocked(getCachedComparables).mockResolvedValue(null);

      const req = mockNextRequest({ keywords: 'macbook' });
      const res = await comparablesPOST(req);
      expect(res.status).toBe(503);
    });

    it('returns 400 for missing keywords', async () => {
      const req = mockNextRequest({});
      const res = await comparablesPOST(req);
      expect(res.status).toBe(400);
    });
  });
});
