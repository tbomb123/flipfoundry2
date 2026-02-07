/**
 * GET/POST /api/saved-searches
 * 
 * List and create saved searches.
 * User identified by API key (temporary until full auth).
 * Does NOT trigger eBay calls.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isDatabaseConfigured } from '@/lib/db';
import {
  createSavedSearch,
  getSavedSearches,
  countSavedSearches,
  SAVED_SEARCH_LIMITS,
} from '@/lib/saved-searches';

export const runtime = 'nodejs';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const FiltersSchema = z.object({
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  category: z.string().optional(),
  condition: z.string().optional(),
}).passthrough(); // Allow additional filters

const CreateSavedSearchSchema = z.object({
  name: z.string().min(1).max(SAVED_SEARCH_LIMITS.MAX_NAME_LENGTH),
  query: z.string().min(1).max(SAVED_SEARCH_LIMITS.MAX_QUERY_LENGTH),
  filters: FiltersSchema.optional(),
  alertEnabled: z.boolean().optional().default(false),
  minimumScore: z.number().min(0).max(100).optional().default(70),
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract user ID from request (API key for now)
 */
function getUserId(request: NextRequest): string | null {
  // Check header first
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) return apiKey;
  
  // Check query param
  const queryKey = request.nextUrl.searchParams.get('api_key');
  if (queryKey) return queryKey;
  
  // For development: use a placeholder
  if (process.env.NODE_ENV === 'development' && !process.env.API_KEY) {
    return 'dev-user';
  }
  
  return null;
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/saved-searches
 * List all saved searches for the authenticated user
 */
export async function GET(request: NextRequest) {
  // Check database configuration
  if (!isDatabaseConfigured()) {
    return Response.json(
      {
        success: false,
        error: { code: 'DB_NOT_CONFIGURED', message: 'Database not configured' },
      },
      { status: 503 }
    );
  }

  // Get user ID
  const userId = getUserId(request);
  if (!userId) {
    return Response.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'API key required' },
      },
      { status: 401 }
    );
  }

  try {
    // Parse query params
    const alertsOnly = request.nextUrl.searchParams.get('alerts_only') === 'true';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);

    const [searches, total] = await Promise.all([
      getSavedSearches(userId, { 
        alertEnabledOnly: alertsOnly, 
        limit: Math.min(limit, 100),
        offset 
      }),
      countSavedSearches(userId),
    ]);

    return Response.json({
      success: true,
      data: {
        searches,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + searches.length < total,
        },
        limits: {
          maxSearches: SAVED_SEARCH_LIMITS.MAX_PER_USER,
          remaining: Math.max(0, SAVED_SEARCH_LIMITS.MAX_PER_USER - total),
        },
      },
    });
  } catch (error) {
    console.error('[SAVED SEARCHES] GET error:', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch saved searches',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved-searches
 * Create a new saved search
 */
export async function POST(request: NextRequest) {
  // Check database configuration
  if (!isDatabaseConfigured()) {
    return Response.json(
      {
        success: false,
        error: { code: 'DB_NOT_CONFIGURED', message: 'Database not configured' },
      },
      { status: 503 }
    );
  }

  // Get user ID
  const userId = getUserId(request);
  if (!userId) {
    return Response.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'API key required' },
      },
      { status: 401 }
    );
  }

  try {
    // Check limit
    const count = await countSavedSearches(userId);
    if (count >= SAVED_SEARCH_LIMITS.MAX_PER_USER) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'LIMIT_REACHED',
            message: `Maximum ${SAVED_SEARCH_LIMITS.MAX_PER_USER} saved searches allowed`,
          },
        },
        { status: 429 }
      );
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        {
          success: false,
          error: { code: 'INVALID_JSON', message: 'Invalid JSON in request body' },
        },
        { status: 400 }
      );
    }

    const parseResult = CreateSavedSearchSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    // Create saved search
    const savedSearch = await createSavedSearch({
      userId,
      ...parseResult.data,
    });

    console.log(`[SAVED SEARCHES] Created: ${savedSearch.id} for user ${userId}`);

    return Response.json(
      {
        success: true,
        data: savedSearch,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[SAVED SEARCHES] POST error:', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create saved search',
        },
      },
      { status: 500 }
    );
  }
}
