/**
 * GET /api/test-ebay
 * 
 * DISABLED: eBay API calls are temporarily disabled due to rate limiting.
 * This endpoint is blocked to prevent accidental API calls.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  // Endpoint disabled - do not make any eBay calls
  return NextResponse.json({
    success: false,
    error: {
      code: 'ENDPOINT_DISABLED',
      message: 'eBay test endpoint is temporarily disabled due to rate limiting. Enable FEATURE_EBAY_CALLS=true when rate limits clear.',
    },
    meta: {
      timestamp: new Date().toISOString(),
      featureFlag: 'FEATURE_EBAY_CALLS',
      status: 'disabled',
    },
  }, { status: 503 });
}
