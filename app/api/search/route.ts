/**
 * POST /api/search
 * Search for active eBay listings with rate limiting and validation
 */

import { NextRequest } from 'next/server';
import { searchListings, isEbayConfigured } from '@/lib/ebay-server';
import { SearchParamsSchema, sanitizeKeywords, validatePriceRange } from '@/lib/validation';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';
import { getCachedSearch, setCachedSearch } from '@/lib/cache';
import { recordCacheEvent } from '@/lib/cache-stats';

export const runtime = 'edge';
export const preferredRegion = 'iad1';

// In-memory deduplication cache (2 second TTL)
const dedupeCache = new Map<string, { data: unknown; timestamp: number }>();
const DEDUPE_TTL_MS = 2000;

function getDeduped(key: string): unknown | null {
  const entry = dedupeCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DEDUPE_TTL_MS) {
    dedupeCache.delete(key);
    return null;
  }
  return entry.data;
}

function setDeduped(key: string, data: unknown): void {
  dedupeCache.set(key, { data, timestamp: Date.now() });
}

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

    const parseResult = SearchParamsSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
            details: parseResult.error.issues,
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const params = parseResult.data;

    // Additional price range validation
    const priceValidation = validatePriceRange(params.minPrice, params.maxPrice);
    if (!priceValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: priceValidation.error },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize keywords
    params.keywords = sanitizeKeywords(params.keywords);

    // Deduplication check (2 second window)
    const dedupeKey = JSON.stringify({ keywords: params.keywords, minPrice: params.minPrice, maxPrice: params.maxPrice, condition: params.condition, page: params.page });
    const deduped = getDeduped(dedupeKey);
    if (deduped) {
      console.log('[DEDUPE] Returning cached result for:', dedupeKey);
      return new Response(
        JSON.stringify({
          success: true,
          data: deduped,
          meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), executionTimeMs: Date.now() - startTime, deduplicated: true },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Dedupe': 'HIT' } }
      );
    }

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
    const cacheParams = { keywords: params.keywords, minPrice: params.minPrice, maxPrice: params.maxPrice, condition: params.condition };
    const cached = await getCachedSearch(cacheParams);
    if (cached) {
      recordCacheEvent('search', true);
      return new Response(
        JSON.stringify({
          success: true,
          data: cached,
          meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), executionTimeMs: Date.now() - startTime, cached: true },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT', 'X-RateLimit-Limit': String(rateLimitResult.limit), 'X-RateLimit-Remaining': String(rateLimitResult.remaining), 'X-RateLimit-Reset': String(rateLimitResult.reset) } }
      );
    }

    // Perform search
    const result = await searchListings(params);
    recordCacheEvent('search', false);
    const duration = Date.now() - startTime;

    // Cache result
    setCachedSearch(cacheParams, result);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
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
    console.error('Search error:', error);
    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
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
