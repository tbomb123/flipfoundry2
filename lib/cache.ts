/**
 * Search Result Cache for FlipFoundry
 * Uses Upstash Redis when available, skips caching otherwise.
 * Server-side only.
 */

import { getRedis } from './redis';

const SEARCH_CACHE_TTL = 3600;       // 1 hour for search results
const COMPARABLES_CACHE_TTL = 7200;  // 2 hours for comparables (sold data changes less)

function buildCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return `flipfoundry:${prefix}:${sorted}`;
}

export async function getCachedSearch(params: Record<string, unknown>): Promise<unknown | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = buildCacheKey('search', params);
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function setCachedSearch(params: Record<string, unknown>, data: unknown): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = buildCacheKey('search', params);
    await redis.setex(key, SEARCH_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Cache write failure is non-fatal
  }
}

export async function getCachedComparables(keywords: string, opts: Record<string, unknown>): Promise<unknown | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const key = buildCacheKey('comparables', { keywords, ...opts });
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function setCachedComparables(keywords: string, opts: Record<string, unknown>, data: unknown): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = buildCacheKey('comparables', { keywords, ...opts });
    await redis.setex(key, COMPARABLES_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Cache write failure is non-fatal
  }
}
