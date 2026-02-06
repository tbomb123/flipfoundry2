# Next.js 15 Upgrade

**Date:** January 2026
**Branch:** `architecture-cleanup`

---

## Version Changes

| Package | Before | After |
|---------|--------|-------|
| `next` | 14.2.35 | 15.5.12 |
| `eslint-config-next` | 14.2.35 | 15.5.12 |
| `@sentry/nextjs` | (previous) | latest |
| `react` | 18.3.1 | 18.3.1 (unchanged) |
| `react-dom` | 18.3.1 | 18.3.1 (unchanged) |

**React 18 retained.** Next.js 15 accepts `react@^18.2.0` as a peer dependency. No React 19 migration required.

---

## CVE Resolution

| CVE | Status |
|-----|--------|
| GHSA-9g9p-9gw9-jx7f (Image Optimizer DoS) | **RESOLVED** — fixed in Next.js 15.5.10+ |
| GHSA-h25m-26qc-wcjf (RSC Deserialization DoS) | **RESOLVED** — fixed in Next.js 15.5.10+ |
| glob command injection | **RESOLVED** — `eslint-config-next@15.5.12` uses fixed glob |

**`npm audit`: 0 vulnerabilities**

---

## Breaking Changes Handled

| Change | Impact | Resolution |
|--------|--------|------------|
| `tsconfig.json` target override | Next.js 15 sets `target: ES2017` | Auto-applied, compatible with existing code |
| Edge Runtime warning | Static generation disabled for edge pages | No impact — our page uses `ssr: false` dynamic import |
| Middleware bundle size | Increased from 26.2KB to 86.2KB | Acceptable — Sentry SDK contributes most of the increase |

**No application code changes were required.**

---

## Verification

| Check | Result |
|-------|--------|
| `npm install` | PASS — 0 vulnerabilities |
| `npm test` | PASS — 44/44 |
| `npm run build` | PASS — 5 routes + middleware |
| API routes | PASS — all return correct status codes |
| Security headers | PASS — CSP, HSTS, X-Frame, Referrer all present |
| `npm audit` | **0 vulnerabilities** |
