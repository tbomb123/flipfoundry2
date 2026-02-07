import { NextResponse } from 'next/server';

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

  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
