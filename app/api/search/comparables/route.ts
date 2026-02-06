/**
 * POST /api/search/comparables
 * Get sold comparables for market analysis
 */

import { NextRequest } from 'next/server';
import { getSoldComparables, isEbayConfigured } from '@/lib/ebay-server';
import { ComparablesParamsSchema, sanitizeKeywords } from '@/lib/validation';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';
import { getCachedComparables, setCachedComparables } from '@/lib/cache';
import { recordCacheEvent } from '@/lib/cache-stats';

export const runtime = 'edge';
export const preferredRegion = 'iad1';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(request, { maxRequests: 20, windowMs: 5 * 60 * 1000 });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_JSON', message: 'Invalid JSON in request body' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const parseResult = ComparablesParamsSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid comparables parameters',
            details: parseResult.error.issues,
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const params = parseResult.data;
    params.keywords = sanitizeKeywords(params.keywords);

    // Check eBay configuration
    if (!isEbayConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'eBay API not configured on server' },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheOpts = { categoryId: params.categoryId, condition: params.condition, daysBack: params.daysBack, maxResults: params.maxResults };
    const cached = await getCachedComparables(params.keywords, cacheOpts);
    if (cached) {
      recordCacheEvent('comparables', true);
      return new Response(
        JSON.stringify({
          success: true,
          data: { comparables: cached },
          meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), executionTimeMs: Date.now() - startTime, cached: true },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT', 'X-RateLimit-Limit': String(rateLimitResult.limit), 'X-RateLimit-Remaining': String(rateLimitResult.remaining), 'X-RateLimit-Reset': String(rateLimitResult.reset) } }
      );
    }

    // Fetch comparables
    const comparables = await getSoldComparables(params.keywords, {
      categoryId: params.categoryId,
      condition: params.condition,
      daysBack: params.daysBack,
      maxResults: params.maxResults,
    });
    recordCacheEvent('comparables', false);

    // Cache result
    setCachedComparables(params.keywords, cacheOpts, comparables);

    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        data: { comparables },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          executionTimeMs: duration,
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
    console.error('Comparables error:', error);
    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'COMPARABLES_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          executionTimeMs: duration,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
