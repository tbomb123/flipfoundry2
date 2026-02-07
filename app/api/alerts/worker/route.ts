/**
 * POST /api/alerts/worker
 * 
 * Trigger the alert worker manually or via cron.
 * Protected by API key.
 * 
 * This is the ONLY endpoint that executes saved searches against eBay.
 */

import { NextRequest } from 'next/server';
import { runAlertWorker, getWorkerStatus } from '@/lib/alert-worker';

export const runtime = 'nodejs';

// Allow longer execution for worker
export const maxDuration = 60; // 60 seconds

/**
 * GET /api/alerts/worker
 * Get worker status
 */
export async function GET(request: NextRequest) {
  // Check API key
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const providedKey = request.headers.get('x-api-key') || 
                        request.nextUrl.searchParams.get('api_key');
    if (providedKey !== apiKey) {
      return Response.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
        { status: 401 }
      );
    }
  }

  const status = await getWorkerStatus();
  
  return Response.json({
    success: true,
    data: status,
  });
}

/**
 * POST /api/alerts/worker
 * Trigger worker run
 */
export async function POST(request: NextRequest) {
  // Check API key (required for worker trigger)
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const providedKey = request.headers.get('x-api-key') || 
                        request.nextUrl.searchParams.get('api_key');
    if (providedKey !== apiKey) {
      return Response.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
        { status: 401 }
      );
    }
  }

  // Parse optional config overrides
  let config: { dryRun?: boolean; maxSearchesPerRun?: number } = {};
  try {
    const body = await request.json().catch(() => ({}));
    config = {
      dryRun: body.dryRun === true,
      maxSearchesPerRun: typeof body.maxSearchesPerRun === 'number' 
        ? Math.min(body.maxSearchesPerRun, 50) 
        : undefined,
    };
  } catch {
    // Use defaults
  }

  console.log('[WORKER API] Triggering worker run', config);
  
  const result = await runAlertWorker(config);

  return Response.json({
    success: true,
    data: result,
  });
}
