/**
 * POST /api/cards/estimate-grade
 * 
 * AI-powered grade estimation for raw sports cards.
 * Uses Redis cache (30 day TTL) and queued AI requests.
 * 
 * Providers:
 *   - Ximilar (if XIMILAR_API_TOKEN configured)
 *   - Mock (fallback for development)
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
  isGradeCacheAvailable,
  type GradeEstimate
} from '@/lib/grade-cache';
import { 
  estimateGrade, 
  getGradingStatus,
  isGradingAvailable 
} from '@/lib/grading';
import { logGradeRequest } from '@/lib/grade-stats';

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
      const durationMs = Date.now() - startTime;
      
      // Log cache hit
      await logGradeRequest({
        itemId,
        provider: cached.provider || 'cached',
        confidence: cached.confidence,
        durationMs,
        cacheHit: true,
        success: true,
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          data: cached,
          meta: {
            timestamp: new Date().toISOString(),
            executionTimeMs: durationMs,
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

    // Enqueue AI grade estimation request via pluggable provider
    const response = await estimateGrade({
      itemId,
      imageUrl,
      additionalImageUrls,
    });

    // Handle provider errors gracefully
    if (!response.success || !response.result) {
      const durationMs = Date.now() - startTime;
      const error = response.error || { 
        code: 'UNKNOWN_ERROR', 
        message: 'Unable to estimate grade from available photos.',
        retryable: false 
      };
      
      // Log provider error
      await logGradeRequest({
        itemId,
        provider: getGradingStatus().activeProvider,
        confidence: null,
        durationMs,
        cacheHit: false,
        success: false,
        error: error.message,
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          meta: {
            timestamp: new Date().toISOString(),
            executionTimeMs: durationMs,
            retryable: error.retryable,
            provider: getGradingStatus(),
          },
        }),
        { 
          status: error.retryable ? 503 : 422, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build cache entry
    const estimate: GradeEstimate = {
      itemId,
      overallGrade: response.result.overallGrade,
      subgrades: response.result.subgrades,
      confidence: response.result.confidence,
      provider: response.result.provider,
      disclaimer: response.result.disclaimer,
      estimatedAt: response.result.estimatedAt,
    };

    // Store in Redis cache (30 day TTL)
    await setCachedGradeEstimate(estimate);

    const gradingStatus = getGradingStatus();
    const durationMs = Date.now() - startTime;
    
    // Log successful grade estimation
    await logGradeRequest({
      itemId,
      provider: estimate.provider,
      confidence: estimate.confidence,
      durationMs,
      cacheHit: false,
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: estimate,
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: durationMs,
          cached: false,
          cacheAvailable: isGradeCacheAvailable(),
          provider: {
            name: gradingStatus.activeProvider,
            configured: gradingStatus.providerConfigured,
          },
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
    const durationMs = Date.now() - startTime;
    
    // Log unexpected error - extract itemId from request body if possible
    let itemId = 'unknown';
    try {
      const body = await request.clone().json();
      itemId = body?.itemId || 'unknown';
    } catch {
      // Ignore parse errors
    }
    
    await logGradeRequest({
      itemId,
      provider: 'unknown',
      confidence: null,
      durationMs,
      cacheHit: false,
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'GRADE_ESTIMATION_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: durationMs,
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
  const gradingStatus = getGradingStatus();

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        featureEnabled: FEATURE_FLAGS.ENABLE_GRADE_ESTIMATION,
        gradingAvailable: isGradingAvailable(),
        cacheAvailable: isGradeCacheAvailable(),
        cacheTTL: '30 days',
        provider: gradingStatus,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
