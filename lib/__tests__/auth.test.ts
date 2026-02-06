/**
 * Tests for API key authentication in middleware
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// We test by directly calling the middleware function
const originalEnv = { ...process.env };

describe('API Key Authentication', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('when API_KEY is set', () => {
    it('returns 401 without x-api-key header', async () => {
      process.env.API_KEY = 'test-secret-key-123';
      const { middleware } = await import('../../middleware');

      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const res = middleware(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('unauthorized');
    });

    it('returns 401 with wrong x-api-key', async () => {
      process.env.API_KEY = 'test-secret-key-123';
      const { middleware } = await import('../../middleware');

      const req = new NextRequest('http://localhost:3000/api/search/status', {
        headers: { 'x-api-key': 'wrong-key' },
      });
      const res = middleware(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 (passes through) with correct x-api-key', async () => {
      process.env.API_KEY = 'test-secret-key-123';
      const { middleware } = await import('../../middleware');

      const req = new NextRequest('http://localhost:3000/api/search/cache/stats', {
        headers: { 'x-api-key': 'test-secret-key-123' },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('does not require auth for unprotected routes', async () => {
      process.env.API_KEY = 'test-secret-key-123';
      const { middleware } = await import('../../middleware');

      const req = new NextRequest('http://localhost:3000/api/health');
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('does not require auth for the homepage', async () => {
      process.env.API_KEY = 'test-secret-key-123';
      const { middleware } = await import('../../middleware');

      const req = new NextRequest('http://localhost:3000/');
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('protects all four endpoints', async () => {
      process.env.API_KEY = 'test-secret-key-123';
      const { middleware } = await import('../../middleware');

      const endpoints = ['/api/search', '/api/search/comparables', '/api/search/status', '/api/search/cache/stats'];
      for (const ep of endpoints) {
        const req = new NextRequest(`http://localhost:3000${ep}`, {
          method: ep.includes('search') && !ep.includes('status') && !ep.includes('cache') ? 'POST' : 'GET',
        });
        const res = middleware(req);
        expect(res.status).toBe(401, `Expected 401 for ${ep}`);
      }
    });
  });

  describe('when API_KEY is unset (dev mode)', () => {
    it('allows requests without x-api-key', async () => {
      delete process.env.API_KEY;
      const { middleware } = await import('../../middleware');

      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });
  });
});
