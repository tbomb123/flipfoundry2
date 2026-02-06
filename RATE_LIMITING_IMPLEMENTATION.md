# FlipFoundry - Rate Limiting & Caching Implementation

**Date:** January 2026
**Branch:** `architecture-cleanup`

---

## 1. Architecture Overview

```
Client Request
      |
      v
Next.js Edge Runtime (API Route)
      |
      v
┌──────────────────────────────────────────────┐
│  Rate Limiter (lib/rate-limit.ts)            │
│                                              │
│  Upstash configured?                         │
│    YES → Ratelimit.slidingWindow(20, '5m')   │
│           via @upstash/ratelimit             │
│    NO  → In-memory Map fallback (local dev)  │
│                                              │
│  429 if exceeded                             │
└──────────────────────────────────────────────┘
      |
      v (allowed)
┌──────────────────────────────────────────────┐
│  Cache Layer (lib/cache.ts)                  │
│                                              │
│  Redis configured?                           │
│    YES → Check flipfoundry:search:... key    │
│           HIT  → Return cached + X-Cache:HIT │
│           MISS → Continue to eBay            │
│    NO  → Skip cache, always fetch            │
└──────────────────────────────────────────────┘
      |
      v (cache miss)
┌──────────────────────────────────────────────┐
│  eBay Finding API (lib/ebay-server.ts)       │
│                                              │
│  Response → Cache in Redis (if configured)   │
│  Search results: 1h TTL                      │
│  Comparables:    2h TTL                      │
└──────────────────────────────────────────────┘
      |
      v
Client Response (with X-RateLimit-* and X-Cache headers)
```

---

## 2. Files

| File | Purpose |
|------|---------|
| `lib/redis.ts` | Singleton Redis client. Returns `null` if unconfigured. |
| `lib/rate-limit.ts` | Distributed rate limiter (Upstash) with in-memory fallback. Exports unchanged `checkRateLimit`, `createRateLimitResponse`. |
| `lib/cache.ts` | Search result and comparables cache. Silent no-op if Redis unavailable. |

---

## 3. Rate Limiting

### Algorithm: Sliding Window

- **Window:** 5 minutes
- **Max requests:** 20 per IP per window (search & comparables)
- **Status endpoint:** 100 requests / 15 minutes
- **Identifier:** Client IP from `x-forwarded-for` → `x-real-ip` → `'unknown'`

### Behavior Matrix

| Upstash configured? | Redis reachable? | Behavior |
|---------------------|------------------|----------|
| YES | YES | Distributed sliding window via Upstash |
| YES | NO (timeout/error) | Falls back to in-memory for that request |
| NO | N/A | In-memory Map (local dev only) |

### Response Headers

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 17
X-RateLimit-Reset: 1706803200000
Retry-After: 180  (only on 429)
```

---

## 4. Caching

### Cache Keys

```
flipfoundry:search:condition=Used&keywords=macbook+pro&maxPrice=500&minPrice=50
flipfoundry:comparables:categoryId=undefined&condition=Used&daysBack=30&keywords=macbook+pro&maxResults=10
```

### TTLs

| Data type | TTL | Rationale |
|-----------|-----|-----------|
| Search results (active listings) | 1 hour | Listings change frequently |
| Comparables (sold items) | 2 hours | Historical data is more stable |

### Cache Headers

```
X-Cache: HIT   (served from Redis)
X-Cache: MISS  (fetched from eBay, then cached)
```

---

## 5. eBay API Quota Protection

Without caching, each user search triggers:
- 1 `findItemsByKeywords` call (search)
- N `findCompletedItems` calls (comparables per listing, typically 12)

With caching:
- Identical searches within 1h: 0 API calls
- Comparable lookups for same title within 2h: 0 API calls
- Estimated 3-5x reduction in eBay API usage for typical traffic patterns

---

## 6. Environment Variables

```
UPSTASH_REDIS_REST_URL=https://us1-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYNgxxxxxxxxxxxxxxxxxxxxx
```

Both are **server-side only** — never prefixed with `NEXT_PUBLIC_`, never exposed to the client bundle. Stored in Vercel project settings under Environment Variables (Production + Preview).

---

## 7. Cost Profile

Upstash free tier: 10,000 commands/day. At 20 searches/day average with 12 comparables each:
- Without caching: ~260 Redis commands (rate limit checks)
- With caching + rate limiting: ~520 commands on cold cache, ~260 on warm
- Well within free tier for early-stage traffic
