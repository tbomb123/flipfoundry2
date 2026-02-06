/**
 * Middleware: API Key Authentication
 * Note: CSP/security headers should be configured at the deployment level
 * (Vercel headers config or CDN) rather than middleware, to avoid
 * conflicts with preview/iframe environments.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/api/search', '/api/search/comparables', '/api/search/status', '/api/search/cache/stats'];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function checkApiKey(request: NextRequest): Response | null {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return null;
  }

  const providedKey = request.headers.get('x-api-key');

  if (!providedKey || providedKey !== apiKey) {
    return new Response(
      JSON.stringify({ error: 'unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedRoute(pathname)) {
    const authResponse = checkApiKey(request);
    if (authResponse) return authResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|monitoring).*)',
  ],
};
