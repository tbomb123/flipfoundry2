/**
 * Tests for lib/cache.ts
 * Tests cache key construction and Redis interactions (mocked).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
};

vi.mock('../redis', () => ({
  getRedis: vi.fn(() => mockRedis),
}));

import { getCachedSearch, setCachedSearch, getCachedComparables, setCachedComparables } from '../cache';

describe('cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCachedSearch', () => {
    it('returns cached data when Redis has it', async () => {
      const fakeData = { listings: [{ id: '1' }], total: 1 };
      mockRedis.get.mockResolvedValueOnce(fakeData);

      const result = await getCachedSearch({ keywords: 'laptop', minPrice: 50 });
      expect(result).toEqual(fakeData);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'flipfoundry:search:keywords=laptop&minPrice=50'
      );
    });

    it('returns null on cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await getCachedSearch({ keywords: 'macbook' });
      expect(result).toBeNull();
    });

    it('returns null on Redis error (graceful degradation)', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('connection refused'));
      const result = await getCachedSearch({ keywords: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('setCachedSearch', () => {
    it('stores data with 1h TTL', async () => {
      mockRedis.setex.mockResolvedValueOnce('OK');
      await setCachedSearch({ keywords: 'laptop' }, { listings: [] });
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'flipfoundry:search:keywords=laptop',
        3600,
        expect.any(String)
      );
    });

    it('survives Redis write failure silently', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('write error'));
      await expect(setCachedSearch({ keywords: 'test' }, {})).resolves.toBeUndefined();
    });
  });

  describe('getCachedComparables', () => {
    it('builds correct cache key with sorted params', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      await getCachedComparables('macbook', { daysBack: 30, condition: 'good' });
      expect(mockRedis.get).toHaveBeenCalledWith(
        'flipfoundry:comparables:condition=good&daysBack=30&keywords=macbook'
      );
    });
  });

  describe('setCachedComparables', () => {
    it('stores data with 2h TTL', async () => {
      mockRedis.setex.mockResolvedValueOnce('OK');
      await setCachedComparables('macbook', { daysBack: 30 }, [{ id: '1' }]);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('flipfoundry:comparables:'),
        7200,
        expect.any(String)
      );
    });
  });

  describe('cache key construction', () => {
    it('produces deterministic keys regardless of param order', async () => {
      mockRedis.get.mockResolvedValue(null);
      await getCachedSearch({ minPrice: 50, keywords: 'laptop' });
      await getCachedSearch({ keywords: 'laptop', minPrice: 50 });
      const calls = mockRedis.get.mock.calls;
      expect(calls[0][0]).toBe(calls[1][0]);
    });
  });
});
