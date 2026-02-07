/**
 * Aggressive Search Result Cache for FlipFoundry
 * 
 * Goal: Reduce eBay API usage by 70-90%
 * Uses Upstash Redis when available, skips caching otherwise.
 * Server-side only.
 */

import { getRedis, isRedisConfigured } from './redis';
import crypto from 'crypto';

// Aggressive cache TTLs - minimize API calls
const SEARCH_CACHE_TTL = 120;         // 2 minutes minimum for search results
const COMPARABLES_CACHE_TTL = 300;    // 5 minutes for comparables (sold data)
const CACHE_PREFIX = 'ebay';

// Cache statistics (in-memory for this instance)
let cacheStats = {
  hits: 0,
  misses: 0,
  writes: 0,
  errors: 0,
};

/**
 * Normalize and hash query params for consistent cache keys
 */
function normalizeQuery(params: Record<string, unknown>): string {
  // Sort keys and create deterministic string
  const sorted = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map(k => `${k}=${String(params[k]).toLowerCase().trim()}`)
    .join('&');
  
  // Hash for shorter, consistent keys
  return crypto.createHash('md5').update(sorted).digest('hex').substring(0, 16);
}

/**
 * Build cache key in format: ebay:search:{normalizedQuery}
 */
function buildCacheKey(type: 'search' | 'comparables', params: Record<string, unknown>): string {
  const hash = normalizeQuery(params);
  return `${CACHE_PREFIX}:${type}:${hash}`;
}

/**
 * Get cached search result
 */
export async function getCachedSearch(params: Record<string, unknown>): Promise<unknown | null> {
  const redis = getRedis();
  if (!redis) {
    console.log('[CACHE] Redis not configured. Cache MISS (no-op)');
    return null;
  }

  const key = buildCacheKey('search', params);
  
  try {
    const cached = await redis.get(key);
    
    if (cached) {
      cacheStats.hits++;
      console.log(`[CACHE] HIT for ${key} (total hits: ${cacheStats.hits})`);
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
    
    cacheStats.misses++;
    console.log(`[CACHE] MISS for ${key} (total misses: ${cacheStats.misses})`);
    return null;
  } catch (error) {
    cacheStats.errors++;
    console.error(`[CACHE] Error reading ${key}:`, error);
    return null;
  }
}

/**
 * Store search result in cache
 */
export async function setCachedSearch(params: Record<string, unknown>, data: unknown): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = buildCacheKey('search', params);
  
  try {
    await redis.setex(key, SEARCH_CACHE_TTL, JSON.stringify(data));
    cacheStats.writes++;
    console.log(`[CACHE] WRITE ${key} (TTL: ${SEARCH_CACHE_TTL}s, total writes: ${cacheStats.writes})`);
  } catch (error) {
    cacheStats.errors++;
    console.error(`[CACHE] Error writing ${key}:`, error);
  }
}

/**
 * Get cached comparables result
 */
export async function getCachedComparables(keywords: string, opts: Record<string, unknown>): Promise<unknown | null> {
  const redis = getRedis();
  if (!redis) {
    console.log('[CACHE] Redis not configured. Cache MISS (no-op)');
    return null;
  }

  const key = buildCacheKey('comparables', { keywords, ...opts });
  
  try {
    const cached = await redis.get(key);
    
    if (cached) {
      cacheStats.hits++;
      console.log(`[CACHE] HIT for ${key} (total hits: ${cacheStats.hits})`);
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
    
    cacheStats.misses++;
    console.log(`[CACHE] MISS for ${key} (total misses: ${cacheStats.misses})`);
    return null;
  } catch (error) {
    cacheStats.errors++;
    console.error(`[CACHE] Error reading ${key}:`, error);
    return null;
  }
}

/**
 * Store comparables result in cache
 */
export async function setCachedComparables(keywords: string, opts: Record<string, unknown>, data: unknown): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = buildCacheKey('comparables', { keywords, ...opts });
  
  try {
    await redis.setex(key, COMPARABLES_CACHE_TTL, JSON.stringify(data));
    cacheStats.writes++;
    console.log(`[CACHE] WRITE ${key} (TTL: ${COMPARABLES_CACHE_TTL}s, total writes: ${cacheStats.writes})`);
  } catch (error) {
    cacheStats.errors++;
    console.error(`[CACHE] Error writing ${key}:`, error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(1) : '0.0';
  
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    writes: cacheStats.writes,
    errors: cacheStats.errors,
    hitRate: `${hitRate}%`,
    redisConfigured: isRedisConfigured(),
  };
}

/**
 * Reset cache statistics (for testing)
 */
export function resetCacheStats() {
  cacheStats = { hits: 0, misses: 0, writes: 0, errors: 0 };
  console.log('[CACHE] Stats reset');
}
