/**
 * Grade Estimation Cache
 * 
 * Redis caching for AI-powered grade estimates.
 * 30-day TTL since card grades don't change.
 */

import { getRedis, isRedisConfigured } from './redis';

const GRADE_ESTIMATE_TTL = 60 * 60 * 24 * 30; // 30 days in seconds
const CACHE_PREFIX = 'gradeEstimate';

export interface GradeEstimate {
  itemId: string;
  overallGrade: number;      // 1-10, allows decimals (e.g., 8.5)
  subgrades: {
    centering: number;
    corners: number;
    edges: number;
    surface: number;
  };
  confidence: number;        // 0-1
  provider: string;
  disclaimer: string;
  estimatedAt: string;       // ISO timestamp
}

/**
 * Build cache key for grade estimate
 */
function buildGradeKey(itemId: string): string {
  return `${CACHE_PREFIX}:${itemId}`;
}

/**
 * Get cached grade estimate
 */
export async function getCachedGradeEstimate(itemId: string): Promise<GradeEstimate | null> {
  const redis = getRedis();
  if (!redis) {
    console.log('[GRADE CACHE] Redis not configured. Cache MISS (no-op)');
    return null;
  }

  const key = buildGradeKey(itemId);
  
  try {
    const cached = await redis.get(key);
    
    if (cached) {
      console.log(`[GRADE CACHE] HIT for ${key}`);
      return typeof cached === 'string' ? JSON.parse(cached) : cached as GradeEstimate;
    }
    
    console.log(`[GRADE CACHE] MISS for ${key}`);
    return null;
  } catch (error) {
    console.error(`[GRADE CACHE] Error reading ${key}:`, error);
    return null;
  }
}

/**
 * Store grade estimate in cache (30 day TTL)
 */
export async function setCachedGradeEstimate(estimate: GradeEstimate): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = buildGradeKey(estimate.itemId);
  
  try {
    await redis.setex(key, GRADE_ESTIMATE_TTL, JSON.stringify(estimate));
    console.log(`[GRADE CACHE] WRITE ${key} (TTL: ${GRADE_ESTIMATE_TTL}s / 30 days)`);
  } catch (error) {
    console.error(`[GRADE CACHE] Error writing ${key}:`, error);
  }
}

/**
 * Check if Redis is available for grade caching
 */
export function isGradeCacheAvailable(): boolean {
  return isRedisConfigured();
}
