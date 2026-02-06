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

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get('challenge_code');

  if (!challengeCode) {
    return new Response(
      JSON.stringify({ error: 'Missing challenge_code parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN || '';
  const endpoint = process.env.EBAY_ACCOUNT_DELETION_ENDPOINT || '';

  // SHA-256 hash of: challengeCode + verificationToken + endpoint (exact order)
  const encoder = new TextEncoder();
  const data = encoder.encode(challengeCode + verificationToken + endpoint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const challengeResponse = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return new Response(
    JSON.stringify({ challengeResponse }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST() {
  // Acknowledge deletion notification immediately — no processing required
  return new Response(null, { status: 200 });
}
