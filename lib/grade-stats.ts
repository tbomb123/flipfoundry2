/**
 * Grade Estimation Observability
 * 
 * Tracks grade request metrics via Redis counters and structured logging.
 */

import { getRedis, isRedisConfigured } from './redis';

// Redis key prefix for grade stats
const STATS_PREFIX = 'grade:stats';

// Counter keys
const COUNTER_KEYS = {
  CACHE_HIT: `${STATS_PREFIX}:cache_hit`,
  CACHE_MISS: `${STATS_PREFIX}:cache_miss`,
  PROVIDER_ERROR: `${STATS_PREFIX}:provider_error`,
  TOTAL_REQUESTS: `${STATS_PREFIX}:total_requests`,
  TOTAL_DURATION_MS: `${STATS_PREFIX}:total_duration_ms`,
};

/**
 * Increment a Redis counter
 */
async function incrementCounter(key: string, amount: number = 1): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    await redis.incrby(key, amount);
  } catch (error) {
    console.error(`[GRADE STATS] Failed to increment ${key}:`, error);
  }
}

/**
 * Get counter value from Redis
 */
async function getCounter(key: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  
  try {
    const value = await redis.get(key);
    return parseInt(String(value) || '0', 10);
  } catch (error) {
    console.error(`[GRADE STATS] Failed to get ${key}:`, error);
    return 0;
  }
}

/**
 * Log and track a grade request
 */
export interface GradeRequestLog {
  itemId: string;
  provider: string;
  confidence: number | null;
  durationMs: number;
  cacheHit: boolean;
  success: boolean;
  error?: string;
}

export async function logGradeRequest(log: GradeRequestLog): Promise<void> {
  // Structured console log
  console.log('[GRADE REQUEST]', JSON.stringify({
    itemId: log.itemId,
    provider: log.provider,
    confidence: log.confidence,
    durationMs: log.durationMs,
    cacheHit: log.cacheHit,
    success: log.success,
    error: log.error || null,
    timestamp: new Date().toISOString(),
  }));
  
  // Update Redis counters
  await incrementCounter(COUNTER_KEYS.TOTAL_REQUESTS);
  await incrementCounter(COUNTER_KEYS.TOTAL_DURATION_MS, log.durationMs);
  
  if (log.cacheHit) {
    await incrementCounter(COUNTER_KEYS.CACHE_HIT);
  } else {
    await incrementCounter(COUNTER_KEYS.CACHE_MISS);
  }
  
  if (!log.success) {
    await incrementCounter(COUNTER_KEYS.PROVIDER_ERROR);
  }
}

/**
 * Record cache hit
 */
export async function recordGradeCacheHit(): Promise<void> {
  await incrementCounter(COUNTER_KEYS.CACHE_HIT);
}

/**
 * Record cache miss
 */
export async function recordGradeCacheMiss(): Promise<void> {
  await incrementCounter(COUNTER_KEYS.CACHE_MISS);
}

/**
 * Record provider error
 */
export async function recordGradeProviderError(): Promise<void> {
  await incrementCounter(COUNTER_KEYS.PROVIDER_ERROR);
}

/**
 * Get all grade stats
 */
export async function getGradeStats(): Promise<{
  counters: {
    cacheHits: number;
    cacheMisses: number;
    providerErrors: number;
    totalRequests: number;
    totalDurationMs: number;
  };
  computed: {
    cacheHitRate: string;
    errorRate: string;
    avgDurationMs: number;
  };
  redisAvailable: boolean;
}> {
  const [cacheHits, cacheMisses, providerErrors, totalRequests, totalDurationMs] = await Promise.all([
    getCounter(COUNTER_KEYS.CACHE_HIT),
    getCounter(COUNTER_KEYS.CACHE_MISS),
    getCounter(COUNTER_KEYS.PROVIDER_ERROR),
    getCounter(COUNTER_KEYS.TOTAL_REQUESTS),
    getCounter(COUNTER_KEYS.TOTAL_DURATION_MS),
  ]);
  
  const totalCacheOps = cacheHits + cacheMisses;
  const cacheHitRate = totalCacheOps > 0 
    ? `${((cacheHits / totalCacheOps) * 100).toFixed(1)}%` 
    : 'N/A';
  
  const errorRate = totalRequests > 0
    ? `${((providerErrors / totalRequests) * 100).toFixed(1)}%`
    : 'N/A';
  
  const avgDurationMs = totalRequests > 0
    ? Math.round(totalDurationMs / totalRequests)
    : 0;
  
  return {
    counters: {
      cacheHits,
      cacheMisses,
      providerErrors,
      totalRequests,
      totalDurationMs,
    },
    computed: {
      cacheHitRate,
      errorRate,
      avgDurationMs,
    },
    redisAvailable: isRedisConfigured(),
  };
}

/**
 * Reset all grade stats (for testing)
 */
export async function resetGradeStats(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    await Promise.all([
      redis.set(COUNTER_KEYS.CACHE_HIT, 0),
      redis.set(COUNTER_KEYS.CACHE_MISS, 0),
      redis.set(COUNTER_KEYS.PROVIDER_ERROR, 0),
      redis.set(COUNTER_KEYS.TOTAL_REQUESTS, 0),
      redis.set(COUNTER_KEYS.TOTAL_DURATION_MS, 0),
    ]);
    console.log('[GRADE STATS] Counters reset');
  } catch (error) {
    console.error('[GRADE STATS] Failed to reset counters:', error);
  }
}
