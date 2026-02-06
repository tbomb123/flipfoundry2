# Testing Setup

## Test Stack

| Type | Tool | Location | Count |
|------|------|----------|-------|
| Unit | Vitest 4.x | `lib/__tests__/*.test.ts` | 36 tests across 4 files |
| Integration | Vitest 4.x | `app/api/__tests__/*.test.ts` | 8 tests |
| E2E | Playwright | `tests/e2e/*.spec.ts` | 7 tests |

## Run Locally

```bash
# Unit + integration tests
npm test

# Watch mode (re-runs on file change)
npm run test:watch

# E2E tests (auto-starts dev server)
npm run test:e2e

# TypeScript check
npm run typecheck

# All checks
npm test && npm run typecheck && npm run lint && npm run build
```

## Test Files

| File | Tests | What it covers |
|------|-------|----------------|
| `lib/__tests__/rate-limit.test.ts` | 10 | IP extraction, in-memory rate limiting, response formatting |
| `lib/__tests__/cache.test.ts` | 8 | Cache key construction, Redis get/set, TTL, graceful degradation |
| `lib/__tests__/ebay-server.test.ts` | 11 | Config detection, status reporting, listing parsing, error handling |
| `lib/__tests__/cache-stats.test.ts` | 7 | Hit/miss counters, hit rate calculation, uptime tracking |
| `app/api/__tests__/routes.test.ts` | 8 | Health, status, search, comparables routes (mocked eBay) |
| `tests/e2e/search.spec.ts` | 7 | Page load, demo search, validation, rate limiting, health |

## Configuration

- `vitest.config.ts` — path aliases matching tsconfig, node environment
- `playwright.config.ts` — Chromium headless, auto-starts dev server on port 3000
