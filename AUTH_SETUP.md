# Auth Setup

## Overview

API key authentication protects eBay-backed endpoints from unauthorized use. Implemented in `middleware.ts` — no per-route changes needed.

## Protected Endpoints

| Endpoint | Method | Auth Required |
|----------|--------|---------------|
| `POST /api/search` | POST | YES |
| `POST /api/search/comparables` | POST | YES |
| `GET /api/search/status` | GET | YES |
| `GET /api/search/cache/stats` | GET | YES |
| `GET /api/health` | GET | NO (public) |
| `GET /` | GET | NO (public) |

## How It Works

```
Request → Middleware
            |
            ├── Is it a protected route?
            |     NO  → Apply security headers → Continue
            |     YES ↓
            |
            ├── Is API_KEY env var set?
            |     NO  → Skip auth (dev mode) → Continue
            |     YES ↓
            |
            ├── Does request have x-api-key header matching API_KEY?
            |     NO  → Return 401 {"error": "unauthorized"}
            |     YES → Apply security headers → Continue
```

## Environment Variables

```bash
# Server-side (secret)
API_KEY=your-secret-key-here       # Generate: openssl rand -hex 32

# Client-side (public — needed for browser → API calls)
NEXT_PUBLIC_API_KEY=same-value     # Same as API_KEY
```

## Client-Side Key Exposure — Security Assessment

The `NEXT_PUBLIC_API_KEY` is exposed in the client bundle by design. This is acceptable because:

1. **Same-origin only** — CSP `connect-src 'self'` prevents cross-origin API calls
2. **Rate limiting** — Upstash rate limiter caps requests at 20/5min per IP
3. **No write operations** — The API is read-only (search queries)
4. **Defense in depth** — The API key is one of three protection layers (key + rate limit + CSP)

The key primarily protects against:
- Automated scraping tools using raw HTTP
- Cross-origin abuse (tools that don't execute JavaScript)
- Casual API exploration via Postman/curl without the key

## Key Rotation

1. Generate new key: `openssl rand -hex 32`
2. Update `API_KEY` and `NEXT_PUBLIC_API_KEY` in Vercel env vars
3. Trigger redeployment
4. Old key is immediately invalid (no grace period needed for this app — zero external consumers)

## Testing

7 tests in `lib/__tests__/auth.test.ts`:
- 401 without key
- 401 with wrong key
- 200 with correct key
- Unprotected routes pass without key
- All 4 protected endpoints checked
- Dev mode (no API_KEY) allows all requests
