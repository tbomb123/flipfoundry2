/**
 * GET /api/grade/stats
 * 
 * Grade estimation observability endpoint.
 * Returns cache hit/miss counts, provider errors, and computed metrics.
 * 
 * Protected by API key middleware (same as /api/search/cache/stats).
 */

import { NextRequest } from 'next/server';
import { getGradeStats, resetGradeStats } from '@/lib/grade-stats';
import { isRedisConfigured, getRedis } from '@/lib/redis';
import { FEATURE_FLAGS } from '@/lib/ebay-server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Check API key if configured
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const providedKey = request.headers.get('x-api-key') || 
                        request.nextUrl.searchParams.get('api_key');
    if (providedKey !== apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Check Redis connectivity
  const redisConfigured = isRedisConfigured();
  let redisReachable = false;

  if (redisConfigured) {
    try {
      const redis = getRedis();
      if (redis) {
        await redis.ping();
        redisReachable = true;
      }
    } catch {
      redisReachable = false;
    }
  }

  // Get grade stats
  const stats = await getGradeStats();

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        featureEnabled: FEATURE_FLAGS.ENABLE_GRADE_ESTIMATION,
        redisStatus: { 
          configured: redisConfigured, 
          reachable: redisReachable 
        },
        ...stats,
        namespace: 'grade:stats:*',
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * DELETE /api/grade/stats
 * Reset all grade stats counters (for testing/development)
 */
export async function DELETE(request: NextRequest) {
  // Check API key if configured
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const providedKey = request.headers.get('x-api-key') || 
                        request.nextUrl.searchParams.get('api_key');
    if (providedKey !== apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  await resetGradeStats();

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Grade stats counters have been reset',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
