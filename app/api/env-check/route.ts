/**
 * GET /api/env-check
 * 
 * TEMPORARY DIAGNOSTIC ENDPOINT
 * Returns presence (true/false) of Redis-related environment variables.
 * Does NOT return actual values.
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const ENV_VARS_TO_CHECK = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'REDIS_URL',
  'KV_URL',
  'UPSTASH_URL',
] as const;

export async function GET(request: NextRequest) {
  // Optional: Check API key for security
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

  // Check presence only - do NOT return actual values
  const presence: Record<string, boolean> = {};
  
  for (const varName of ENV_VARS_TO_CHECK) {
    presence[varName] = !!process.env[varName];
  }

  return Response.json(presence);
}
