/**
 * eBay Marketplace Account Deletion/Closure Notification Endpoint
 *
 * GET  — Challenge verification (eBay sends challenge_code, we return SHA-256 hash)
 * POST — Deletion notification (acknowledge immediately with 200)
 *
 * Required env var: EBAY_VERIFICATION_TOKEN (32-80 chars, set in eBay Developer Portal)
 * The endpoint URL registered in eBay must exactly match this route.
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

const ENDPOINT = 'https://flipfoundry2.vercel.app/api/ebay/account-deletion';

export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get('challenge_code');

  if (!challengeCode) {
    return new Response(
      JSON.stringify({ error: 'Missing challenge_code parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN || '';

  // SHA-256 hash (base64 encoded) of: challengeCode + verificationToken + endpoint
  const challengeResponse = crypto
    .createHash('sha256')
    .update(challengeCode + verificationToken + ENDPOINT)
    .digest('base64');

  return new Response(
    JSON.stringify({ challengeResponse }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST() {
  // Acknowledge deletion notification immediately — no processing required
  return new Response(null, { status: 200 });
}
