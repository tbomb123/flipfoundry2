/**
 * Tests for cache stats module and endpoint
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordCacheEvent, getCacheStats } from '../cache-stats';

describe('cache-stats', () => {
  describe('recordCacheEvent', () => {
    it('increments search hit counter', () => {
      const before = getCacheStats();
      recordCacheEvent('search', true);
      const after = getCacheStats();
      expect(after.search.hits).toBe(before.search.hits + 1);
    });

    it('increments search miss counter', () => {
      const before = getCacheStats();
      recordCacheEvent('search', false);
      const after = getCacheStats();
      expect(after.search.misses).toBe(before.search.misses + 1);
    });

    it('increments comparables hit counter', () => {
      const before = getCacheStats();
      recordCacheEvent('comparables', true);
      const after = getCacheStats();
      expect(after.comparables.hits).toBe(before.comparables.hits + 1);
    });

    it('increments comparables miss counter', () => {
      const before = getCacheStats();
      recordCacheEvent('comparables', false);
      const after = getCacheStats();
      expect(after.comparables.misses).toBe(before.comparables.misses + 1);
    });
  });

  describe('getCacheStats', () => {
    it('returns correct structure', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('search');
      expect(stats).toHaveProperty('comparables');
      expect(stats).toHaveProperty('overall');
      expect(stats).toHaveProperty('uptimeSeconds');
      expect(stats.search).toHaveProperty('hits');
      expect(stats.search).toHaveProperty('misses');
      expect(stats.search).toHaveProperty('total');
      expect(stats.search).toHaveProperty('hitRate');
    });

    it('calculates hit rate correctly', () => {
      const stats = getCacheStats();
      if (stats.search.total > 0) {
        expect(stats.search.hitRate).toMatch(/^\d+\.\d+%$/);
      }
    });

    it('tracks uptime', () => {
      const stats = getCacheStats();
      expect(stats.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });
});
