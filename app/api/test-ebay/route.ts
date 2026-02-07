import { NextResponse } from 'next/server';
import { ebayQueue } from '@/lib/ebayQueue';

export const runtime = 'nodejs';

export async function GET() {
  const appId = process.env.EBAY_APP_ID;

  if (!appId) {
    return NextResponse.json({
      error: "Missing EBAY_APP_ID"
    }, { status: 500 });
  }

  const url =
    "https://svcs.ebay.com/services/search/FindingService/v1" +
    "?OPERATION-NAME=findItemsByKeywords" +
    "&SERVICE-VERSION=1.13.0" +
    "&SECURITY-APPNAME=" + appId +
    "&GLOBAL-ID=EBAY-US" +
    "&RESPONSE-DATA-FORMAT=JSON" +
    "&REST-PAYLOAD" +
    "&keywords=nike" +
    "&paginationInput.entriesPerPage=3";

  console.log("TEST EBAY URL:", url);
  console.log("[TEST-EBAY] Queuing request through global singleton");

  // Route through global queue singleton
  const result = await ebayQueue.add(async () => {
    console.log("[TEST-EBAY] Executing queued request");
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        'X-EBAY-SOA-SECURITY-APPNAME': appId,
        'X-EBAY-SOA-OPERATION-NAME': 'findItemsByKeywords',
        'X-EBAY-SOA-SERVICE-NAME': 'FindingService',
        'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'JSON',
        'X-EBAY-SOA-GLOBAL-ID': 'EBAY-US',
      },
    });

    const text = await response.text();

    console.log("EBAY STATUS:", response.status);
    console.log("EBAY RAW BODY:", text);

    return { text, status: response.status };
  });

  return new NextResponse(result?.text || '{"error":"Queue returned null"}', {
    status: result?.status || 500,
    headers: { "Content-Type": "application/json" },
  });
}
