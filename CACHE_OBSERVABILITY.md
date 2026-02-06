# Cache Observability

## Endpoint

```
GET /api/search/cache/stats
```

## Response Schema

```json
{
  "success": true,
  "data": {
    "redis": {
      "configured": false,
      "reachable": false
    },
    "search": {
      "hits": 0,
      "misses": 5,
      "total": 5,
      "hitRate": "0.0%"
    },
    "comparables": {
      "hits": 12,
      "misses": 3,
      "total": 15,
      "hitRate": "80.0%"
    },
    "overall": {
      "totalHits": 12,
      "totalRequests": 20,
      "hitRate": "60.0%"
    },
    "namespace": "flipfoundry:search:*, flipfoundry:comparables:*",
    "uptimeSeconds": 3600
  }
}
```

## Fields

| Field | Description |
|-------|-------------|
| `redis.configured` | Whether `UPSTASH_REDIS_REST_URL` and `TOKEN` are set |
| `redis.reachable` | Whether Redis responded to PING (only checked if configured) |
| `search.*` | Hit/miss counters for `/api/search` cache lookups |
| `comparables.*` | Hit/miss counters for `/api/search/comparables` cache lookups |
| `overall.*` | Aggregate across both endpoints |
| `hitRate` | Percentage string or `"N/A"` if no requests yet |
| `namespace` | Redis key prefixes used (no secrets) |
| `uptimeSeconds` | Seconds since the Edge Runtime instance started (resets per cold start) |

## Architecture

```
lib/cache-stats.ts       ← In-memory counters (module-level variables)
  ├── recordCacheEvent() ← Called by search + comparables routes
  └── getCacheStats()    ← Called by stats route

app/api/search/cache/stats/route.ts
  ├── GET handler
  ├── Reads counters from cache-stats.ts
  └── Pings Redis for reachability check
```

## Limitations

- Counters are **per Edge Runtime instance** (reset on cold start, not shared across invocations on Vercel)
- For persistent metrics across all instances, use Sentry Performance or a dedicated metrics service
- The endpoint does NOT expose Redis keys, credentials, or any secrets

## Testing

Unit tests in `lib/__tests__/cache-stats.test.ts` cover:
- Counter incrementing (search hits/misses, comparables hits/misses)
- Stats structure validation
- Hit rate calculation
- Uptime tracking
