/**
 * GET/POST /api/alerts/worker
 * 
 * Alert worker management endpoint.
 * 
 * GET: Returns worker status and pending search count
 * POST: Triggers a worker run (protected by API key)
 * 
 * SAFETY: Worker respects FEATURE_EBAY_CALLS flag.
 * When false, searches are simulated (no eBay calls).
 */

import { NextRequest } from 'next/server';
import { runAlertWorker, getWorkerStatus } from '@/lib/alert-worker';

export const runtime = 'nodejs';

// Allow longer execution for worker
export const maxDuration = 60; // 60 seconds

/**
 * GET /api/alerts/worker
 * Get worker status and pending search count
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
    data: {
      ...status,
      warnings: [
        ...(!status.ebayCallsEnabled ? ['eBay calls DISABLED (FEATURE_EBAY_CALLS=false)'] : []),
        ...(!status.emailReady ? ['Email service not configured'] : []),
        ...(!status.databaseReady ? ['Database not configured'] : []),
      ],
    },
  });
}

/**
 * POST /api/alerts/worker
 * Trigger a worker run
 * 
 * Body (optional):
 * - dryRun: boolean (default: false)
 * - scanBudget: number (default: 20, max: 50)
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
  let config: { dryRun?: boolean; scanBudget?: number } = {};
  try {
    const body = await request.json().catch(() => ({}));
    config = {
      dryRun: body.dryRun === true,
      scanBudget: typeof body.scanBudget === 'number' 
        ? Math.min(body.scanBudget, 50)  // Hard cap at 50
        : undefined,
    };
  } catch {
    // Use defaults
  }

  console.log('[WORKER API] Triggering worker run', config);
  
  const result = await runAlertWorker(config);

  // Return appropriate status code
  const statusCode = result.success ? 200 : 500;

  return Response.json({
    success: result.success,
    data: result,
  }, { status: statusCode });
}
