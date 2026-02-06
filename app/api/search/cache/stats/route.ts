/**
 * GET /api/search/cache/stats
 * Cache observability endpoint. Returns hit/miss counts and Redis status.
 */

import { isRedisConfigured, getRedis } from '@/lib/redis';
import { getCacheStats } from '@/lib/cache-stats';

export const runtime = 'edge';

export async function GET() {
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

  const stats = getCacheStats();

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        redis: { configured: redisConfigured, reachable: redisReachable },
        ...stats,
        namespace: 'flipfoundry:search:*, flipfoundry:comparables:*',
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
