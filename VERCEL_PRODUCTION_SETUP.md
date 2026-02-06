# Vercel Production Setup

## 1. Environment Variables

Set these in Vercel → Project Settings → Environment Variables.

### Production + Preview

| Variable | Value | Type |
|----------|-------|------|
| `EBAY_APP_ID` | Your eBay application ID | Secret |
| `EBAY_CERT_ID` | Your eBay certification ID | Secret |
| `EBAY_DEV_ID` | Your eBay developer ID | Secret |
| `EBAY_SANDBOX` | `false` | Plain |
| `EBAY_SITE_ID` | `0` (US) | Plain |
| `UPSTASH_REDIS_REST_URL` | `https://us1-xxxxx.upstash.io` | Secret |
| `UPSTASH_REDIS_REST_TOKEN` | `AYNgxxxxx` | Secret |
| `API_KEY` | `openssl rand -hex 32` output | Secret |
| `NEXT_PUBLIC_API_KEY` | Same value as `API_KEY` | Plain |
| `SENTRY_DSN` | `https://xxx@o123.ingest.us.sentry.io/456` | Secret |
| `NEXT_PUBLIC_SENTRY_DSN` | Same value as `SENTRY_DSN` | Plain |
| `SENTRY_ORG` | Your Sentry org slug | Plain |
| `SENTRY_PROJECT` | `flipfoundry` | Plain |
| `SENTRY_AUTH_TOKEN` | From Sentry → Settings → Auth Tokens | Secret |
| `SENTRY_ENVIRONMENT` | `production` | Plain |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `production` | Plain |

### Preview Only (overrides)

| Variable | Value | Notes |
|----------|-------|-------|
| `EBAY_SANDBOX` | `true` | Use sandbox for PR previews |
| `SENTRY_ENVIRONMENT` | `preview` | Separate Sentry environment |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `preview` | Match server config |

---

## 2. Domains / Redirects

No custom domains required for initial launch. Vercel auto-assigns `flipfoundry-xxx.vercel.app`.

If adding a custom domain:
1. Vercel → Project Settings → Domains → Add
2. Point DNS CNAME to `cname.vercel-dns.com`
3. HSTS header is already set in middleware (auto-active)

---

## 3. Post-Deploy Validation

### Verify API Routes

Replace `YOUR_DOMAIN` and `YOUR_API_KEY`:

```bash
DOMAIN="https://flipfoundry-xxx.vercel.app"
KEY="your-api-key-here"

# Health (no auth)
curl -s "$DOMAIN/api/health"

# Status (auth required)
curl -s -H "x-api-key: $KEY" "$DOMAIN/api/search/status"

# Search (auth required)
curl -s -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"keywords":"macbook pro","minPrice":100,"maxPrice":500}' \
  "$DOMAIN/api/search"

# Cache stats (auth required)
curl -s -H "x-api-key: $KEY" "$DOMAIN/api/search/cache/stats"
```

### Verify Security Headers

```bash
curl -sI "$DOMAIN/" | grep -i "content-security\|x-frame\|strict-trans"
```

### Verify No Secrets Exposed

```bash
# Download and scan client JS
curl -s "$DOMAIN/" | grep -o 'src="[^"]*\.js"' | sed 's/src="//;s/"//' | while read js; do
  curl -s "$DOMAIN$js" | grep -i "EBAY_APP_ID\|UPSTASH.*TOKEN\|SENTRY_AUTH"
done
```

---

## 4. Sentry Verification

After first deployment:

1. Visit the app and trigger a search
2. Open Sentry dashboard → Project → Issues
3. You should see a health signal (no errors = no issues listed, which is correct)
4. To force-test: temporarily add `throw new Error('sentry-test')` in a component, deploy preview, verify error appears in Sentry

Expected Sentry signals:
- Client: Runtime errors from React components
- Server/Edge: API route exceptions (500s)
- Performance: Trace samples at 10% (production)

---

## 5. Redis / Cache Verification

After a few searches:

```bash
curl -s -H "x-api-key: $KEY" "$DOMAIN/api/search/cache/stats" | python3 -m json.tool
```

Expected output after 5+ searches:
```json
{
  "redis": { "configured": true, "reachable": true },
  "search": { "hits": 3, "misses": 2, "total": 5, "hitRate": "60.0%" },
  ...
}
```

If `redis.reachable` is `false`: check Upstash credentials in Vercel env vars.
If `hitRate` is `0%` after repeated identical searches: check Upstash dashboard for connection errors.

---

## 6. Deployment Workflow

1. Merge `architecture-cleanup` → `main`
2. Vercel auto-deploys from `main`
3. Verify using commands above
4. Monitor Sentry for first 24h
