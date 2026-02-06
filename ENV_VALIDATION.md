# Environment Variable Validation

**Date:** January 2026

---

## Current State: ALL APPLICATION VARS MISSING

The preview environment has **zero** application-specific environment variables configured. However, this is NOT the root cause of the outage — the processes crash before reading any env vars (directory not found).

---

## Variables Present in Environment

| Variable | Present | Value |
|----------|---------|-------|
| `STRIPE_API_KEY` | YES | `sk_test_emergent` (platform default, not used by app) |

## Variables Required but Missing

### Server-Side (Set in Vercel / Emergent)

| Variable | Required? | Impact if Missing |
|----------|-----------|-------------------|
| `EBAY_APP_ID` | Optional | App runs in demo mode (generates fake data) |
| `EBAY_CERT_ID` | Optional | Only needed with EBAY_APP_ID |
| `EBAY_DEV_ID` | Optional | Only needed with EBAY_APP_ID |
| `EBAY_SANDBOX` | Optional | Defaults to `false` |
| `EBAY_SITE_ID` | Optional | Defaults to `0` (US) |
| `UPSTASH_REDIS_REST_URL` | Optional | Falls back to in-memory rate limiting/no cache |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Falls back to in-memory |
| `API_KEY` | Optional | Auth skipped when unset (dev-friendly) |
| `SENTRY_DSN` | Optional | Sentry disabled when unset |

### Client-Side (Embedded in build)

| Variable | Required? | Impact if Missing |
|----------|-----------|-------------------|
| `NEXT_PUBLIC_API_KEY` | Optional | Client sends no x-api-key header |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Client-side Sentry disabled |

---

## Key Finding

**The app is designed to run with ZERO env vars in development/preview.** All external services (eBay, Upstash, Sentry) gracefully degrade. The demo mode activates automatically when eBay credentials are absent. Auth is skipped when API_KEY is unset.

**The env vars are NOT blocking the preview.** The structural directory mismatch is.

---

## What Must Be Added (After Fix)

For a fully functional preview, set these in Emergent/Vercel:

| Priority | Variable | Where to Obtain |
|----------|----------|----------------|
| P0 (for live data) | `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_DEV_ID` | https://developer.ebay.com/my/keys |
| P1 (for caching) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | https://console.upstash.com |
| P1 (for auth) | `API_KEY`, `NEXT_PUBLIC_API_KEY` | `openssl rand -hex 32` |
| P2 (for monitoring) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | https://sentry.io |
