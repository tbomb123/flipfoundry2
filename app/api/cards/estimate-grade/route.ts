/**
 * POST /api/cards/estimate-grade
 * 
 * AI-powered grade estimation for raw sports cards.
 * Uses Redis cache (30 day TTL) and queued AI requests.
 * 
 * Input:
 *   - itemId: string (required)
 *   - imageUrl: string (required)
 *   - additionalImageUrls?: string[] (optional)
 * 
 * Output:
 *   - overallGrade: number (1-10, decimals allowed)
 *   - subgrades: { centering, corners, edges, surface }
 *   - confidence: number (0-1)
 *   - provider: string
 *   - disclaimer: string
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { FEATURE_FLAGS } from '@/lib/ebay-server';
import { 
  getCachedGradeEstimate, 
  setCachedGradeEstimate,
  isGradeCacheAvailable 
} from '@/lib/grade-cache';
import { estimateGrade, getGradeProviderStatus } from '@/lib/grade-provider';

export const runtime = 'nodejs';

// Input validation schema
const GradeEstimateInputSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  imageUrl: z.string().url('imageUrl must be a valid URL'),
  additionalImageUrls: z.array(z.string().url()).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Feature flag check
  if (!FEATURE_FLAGS.ENABLE_GRADE_ESTIMATION) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: 'Grade estimation feature is currently disabled.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
        },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
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

    const parseResult = GradeEstimateInputSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input parameters',
            details: parseResult.error.issues,
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { itemId, imageUrl, additionalImageUrls } = parseResult.data;

    // Check Redis cache FIRST
    const cached = await getCachedGradeEstimate(itemId);
    if (cached) {
      console.log(`[GRADE API] Cache HIT for item ${itemId}`);
      return new Response(
        JSON.stringify({
          success: true,
          data: cached,
          meta: {
            timestamp: new Date().toISOString(),
            executionTimeMs: Date.now() - startTime,
            cached: true,
            cacheAvailable: isGradeCacheAvailable(),
          },
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          } 
        }
      );
    }

    console.log(`[GRADE API] Cache MISS for item ${itemId}. Queuing AI estimate...`);

    // Enqueue AI grade estimation request
    const estimate = await estimateGrade({
      itemId,
      imageUrl,
      additionalImageUrls,
    });

    // Store in Redis cache (30 day TTL)
    await setCachedGradeEstimate(estimate);

    const providerStatus = getGradeProviderStatus();

    return new Response(
      JSON.stringify({
        success: true,
        data: estimate,
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
          cached: false,
          cacheAvailable: isGradeCacheAvailable(),
          provider: providerStatus,
        },
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        } 
      }
    );

  } catch (error) {
    console.error('[GRADE API] Error:', error);
    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'GRADE_ESTIMATION_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: duration,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET /api/cards/estimate-grade
 * Returns feature status and provider info
 */
export async function GET() {
  const providerStatus = getGradeProviderStatus();

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        featureEnabled: FEATURE_FLAGS.ENABLE_GRADE_ESTIMATION,
        cacheAvailable: isGradeCacheAvailable(),
        cacheTTL: '30 days',
        provider: providerStatus,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
