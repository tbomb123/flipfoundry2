# Feature Flags Guide

## Overview

FlipFoundry uses environment-based feature flags to safely control feature rollout. All flags default to `false` (disabled) in production.

## Available Flags

### FEATURE_GRADE_ESTIMATES

Enables AI-powered grade estimation for raw sports cards.

| Environment | Variable | Default |
|-------------|----------|---------|
| Server | `FEATURE_GRADE_ESTIMATES` | `false` |
| Client | `NEXT_PUBLIC_FEATURE_GRADE_ESTIMATES` | `false` |

**When disabled:**
- "Estimate Grade" button is hidden
- API returns 503 "Feature disabled"
- No AI provider calls are made

**When enabled:**
- Button appears on raw sports card listings
- Uses Ximilar API (or mock if not configured)
- Results cached for 30 days

### FEATURE_COMPARABLES

Enables sold comparables (findCompletedItems) from eBay.

| Environment | Variable | Default |
|-------------|----------|---------|
| Server | `FEATURE_COMPARABLES` | `false` |

**When disabled:**
- Comparables API returns empty array
- No findCompletedItems calls to eBay

---

## Safe Rollout Procedure

### Step 1: Enable on Preview/Staging

```bash
# In Vercel Preview environment
FEATURE_GRADE_ESTIMATES=true
NEXT_PUBLIC_FEATURE_GRADE_ESTIMATES=true
XIMILAR_API_TOKEN=your_token  # Or use mock provider
```

### Step 2: Test Thoroughly

1. Search for sports cards (e.g., "topps baseball card")
2. Verify "Estimate Grade" button appears on raw cards
3. Verify button does NOT appear on graded cards (PSA, BGS, etc.)
4. Click button and verify:
   - Loading state shows
   - Grade estimate displays
   - Subgrades render correctly
   - Confidence shows appropriately
   - Disclaimers are visible

### Step 3: Monitor API Usage

Check Ximilar dashboard for:
- Request volume
- Error rates
- Response times
- Cost tracking

### Step 4: Enable on Production

Only after preview validation:

```bash
# In Vercel Production environment
FEATURE_GRADE_ESTIMATES=true
NEXT_PUBLIC_FEATURE_GRADE_ESTIMATES=true
XIMILAR_API_TOKEN=your_production_token
```

### Step 5: Monitor Production

Watch for:
- Error rates in Sentry
- Cache hit rates at `/api/search/cache/stats`
- **Grade estimation metrics at `/api/grade/stats`**
- User feedback

---

## Grade Estimation Observability

The grade estimation feature includes built-in observability via:

### Structured Logging
Every grade request logs a JSON object:
```json
{
  "itemId": "123456",
  "provider": "ximilar-v1",
  "confidence": 0.85,
  "durationMs": 1234,
  "cacheHit": false,
  "success": true,
  "error": null,
  "timestamp": "2026-02-07T..."
}
```

### Redis Counters (when Redis configured)
- `grade:stats:cache_hit` - Number of cache hits
- `grade:stats:cache_miss` - Number of cache misses
- `grade:stats:provider_error` - Number of provider errors
- `grade:stats:total_requests` - Total requests processed
- `grade:stats:total_duration_ms` - Cumulative processing time

### Stats Endpoint
```bash
# View grade estimation metrics
curl -H "x-api-key: YOUR_API_KEY" https://your-domain/api/grade/stats

# Reset counters (for testing)
curl -X DELETE -H "x-api-key: YOUR_API_KEY" https://your-domain/api/grade/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "featureEnabled": true,
    "redisStatus": { "configured": true, "reachable": true },
    "counters": {
      "cacheHits": 150,
      "cacheMisses": 45,
      "providerErrors": 2,
      "totalRequests": 197,
      "totalDurationMs": 234567
    },
    "computed": {
      "cacheHitRate": "76.9%",
      "errorRate": "1.0%",
      "avgDurationMs": 1191
    }
  }
}
```

---

## Rollback Procedure

To disable immediately:

1. **Vercel Dashboard** → Environment Variables
2. Set `FEATURE_GRADE_ESTIMATES=false`
3. Set `NEXT_PUBLIC_FEATURE_GRADE_ESTIMATES=false`
4. Redeploy (or wait for next deployment)

**Emergency:** The API route checks the flag on every request, so the feature is effectively disabled as soon as the env var changes take effect.

---

## Adding New Feature Flags

1. Add server-side flag in `/lib/ebay-server.ts`:
   ```typescript
   ENABLE_MY_FEATURE: process.env.FEATURE_MY_FEATURE === 'true',
   ```

2. Add client-side flag if UI needs it:
   ```typescript
   const MY_FEATURE_ENABLED = process.env.NEXT_PUBLIC_FEATURE_MY_FEATURE === 'true';
   ```

3. Add to `.env.example` with documentation

4. Document in this file

---

## Current Status

| Flag | Preview | Production |
|------|---------|------------|
| `FEATURE_GRADE_ESTIMATES` | `false` | `false` |
| `FEATURE_COMPARABLES` | `false` | `false` |

Last updated: February 2026
