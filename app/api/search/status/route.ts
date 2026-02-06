/**
 * GET /api/search/status
 * Check eBay API configuration status
 */

import { NextRequest } from 'next/server';
import { getEbayStatus } from '@/lib/ebay-server';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting (more lenient for status checks)
    const rateLimitResult = await checkRateLimit(request, { maxRequests: 100, windowMs: 15 * 60 * 1000 });

    const status = getEbayStatus();

    return new Response(
      JSON.stringify({
        success: true,
        data: status,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.reset),
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get status',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
