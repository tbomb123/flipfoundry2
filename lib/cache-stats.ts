/**
 * Cache Statistics Tracker
 * In-memory counters (best-effort, reset per cold start on Edge).
 * Server-side only.
 */

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
}

export function getCacheStats() {
  const totalSearch = searchHits + searchMisses;
  const totalComparables = comparablesHits + comparablesMisses;
  const totalHits = searchHits + comparablesHits;
  const totalRequests = totalSearch + totalComparables;

  return {
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
    },
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };
}
