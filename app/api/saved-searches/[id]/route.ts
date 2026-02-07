/**
 * GET/PATCH/DELETE /api/saved-searches/[id]
 * 
 * Single saved search operations.
 * User identified by API key (temporary until full auth).
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isDatabaseConfigured } from '@/lib/db';
import {
  getSavedSearchById,
  updateSavedSearch,
  deleteSavedSearch,
  SAVED_SEARCH_LIMITS,
} from '@/lib/saved-searches';

export const runtime = 'nodejs';

// =============================================================================
// VALIDATION
// =============================================================================

const UpdateSavedSearchSchema = z.object({
  name: z.string().min(1).max(SAVED_SEARCH_LIMITS.MAX_NAME_LENGTH).optional(),
  query: z.string().min(1).max(SAVED_SEARCH_LIMITS.MAX_QUERY_LENGTH).optional(),
  filters: z.object({
    priceMin: z.number().min(0).optional(),
    priceMax: z.number().min(0).optional(),
    category: z.string().optional(),
    condition: z.string().optional(),
  }).passthrough().optional(),
  alertEnabled: z.boolean().optional(),
  minimumScore: z.number().min(0).max(100).optional(),
});

// =============================================================================
// HELPERS
// =============================================================================

function getUserId(request: NextRequest): string | null {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) return apiKey;
  
  const queryKey = request.nextUrl.searchParams.get('api_key');
  if (queryKey) return queryKey;
  
  if (process.env.NODE_ENV === 'development' && !process.env.API_KEY) {
    return 'dev-user';
  }
  
  return null;
}

// =============================================================================
// HANDLERS
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/saved-searches/[id]
 * Get a single saved search
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return Response.json(
      { success: false, error: { code: 'DB_NOT_CONFIGURED', message: 'Database not configured' } },
      { status: 503 }
    );
  }

  const userId = getUserId(request);
  if (!userId) {
    return Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'API key required' } },
      { status: 401 }
    );
  }

  try {
    const savedSearch = await getSavedSearchById(id, userId);
    
    if (!savedSearch) {
      return Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Saved search not found' } },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: savedSearch });
  } catch (error) {
    console.error('[SAVED SEARCHES] GET by ID error:', error);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch saved search' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/saved-searches/[id]
 * Update a saved search
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return Response.json(
      { success: false, error: { code: 'DB_NOT_CONFIGURED', message: 'Database not configured' } },
      { status: 503 }
    );
  }

  const userId = getUserId(request);
  if (!userId) {
    return Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'API key required' } },
      { status: 401 }
    );
  }

  try {
    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON' } },
        { status: 400 }
      );
    }

    const parseResult = UpdateSavedSearchSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parseResult.error.issues },
        },
        { status: 400 }
      );
    }

    const updated = await updateSavedSearch(id, userId, parseResult.data);
    
    if (!updated) {
      return Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Saved search not found' } },
        { status: 404 }
      );
    }

    console.log(`[SAVED SEARCHES] Updated: ${id}`);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('[SAVED SEARCHES] PATCH error:', error);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update saved search' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saved-searches/[id]
 * Delete a saved search
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return Response.json(
      { success: false, error: { code: 'DB_NOT_CONFIGURED', message: 'Database not configured' } },
      { status: 503 }
    );
  }

  const userId = getUserId(request);
  if (!userId) {
    return Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'API key required' } },
      { status: 401 }
    );
  }

  try {
    const deleted = await deleteSavedSearch(id, userId);
    
    if (!deleted) {
      return Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Saved search not found' } },
        { status: 404 }
      );
    }

    console.log(`[SAVED SEARCHES] Deleted: ${id}`);
    return Response.json({ success: true, message: 'Saved search deleted' });
  } catch (error) {
    console.error('[SAVED SEARCHES] DELETE error:', error);
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete saved search' } },
      { status: 500 }
    );
  }
}
