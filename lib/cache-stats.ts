/**
 * Cache Statistics Tracker
 * In-memory counters (best-effort, reset per cold start on Edge).
 * Server-side only.
 */

import { isRedisConfigured } from './redis';
import { getCacheStats as getInternalCacheStats } from './cache';

let searchHits = 0;
let searchMisses = 0;
let comparablesHits = 0;
let comparablesMisses = 0;
const startTime = Date.now();

export function recordCacheEvent(type: 'search' | 'comparables', hit: boolean) {
  if (type === 'search') {
    hit ? searchHits++ : searchMisses++;
  } else {
    hit ? comparablesHits++ : comparablesMisses++;
  }
  
  // Log cache performance periodically
  const totalRequests = searchHits + searchMisses + comparablesHits + comparablesMisses;
  if (totalRequests % 10 === 0) {
    const hitRate = ((searchHits + comparablesHits) / totalRequests * 100).toFixed(1);
    console.log(`[CACHE STATS] Hit rate: ${hitRate}% (${searchHits + comparablesHits}/${totalRequests})`);
  }
}

export function getCacheStats() {
  const totalSearch = searchHits + searchMisses;
  const totalComparables = comparablesHits + comparablesMisses;
  const totalHits = searchHits + comparablesHits;
  const totalRequests = totalSearch + totalComparables;
  const internalStats = getInternalCacheStats();

  return {
    redis: {
      configured: isRedisConfigured(),
      internal: internalStats,
    },
    search: {
      hits: searchHits,
      misses: searchMisses,
      total: totalSearch,
      hitRate: totalSearch > 0 ? `${((searchHits / totalSearch) * 100).toFixed(1)}%` : 'N/A',
    },
    comparables: {
      hits: comparablesHits,
      misses: comparablesMisses,
      total: totalComparables,
      hitRate: totalComparables > 0 ? `${((comparablesHits / totalComparables) * 100).toFixed(1)}%` : 'N/A',
    },
    overall: {
      totalHits,
      totalRequests,
      hitRate: totalRequests > 0 ? `${((totalHits / totalRequests) * 100).toFixed(1)}%` : 'N/A',
      apiCallsSaved: totalHits,
      estimatedApiReduction: totalRequests > 0 ? `${((totalHits / totalRequests) * 100).toFixed(0)}%` : '0%',
    },
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };
}
