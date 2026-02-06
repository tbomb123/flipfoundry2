# FlipFoundry - Architecture Summary

**Audit Date:** January 2026
**Repository:** FlipFoundry (imported)
**Auditor:** Senior Architecture Review

---

## 1. System Overview

FlipFoundry is an AI-powered arbitrage platform that scans eBay for undervalued listings and scores them by flip potential. The codebase is a **Next.js 14 application** migrated from an original **Vite + React** stack. The migration is **incomplete** — the project currently does not build.

| Attribute | Value |
|-----------|-------|
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript 5.3 |
| UI | React 18, Tailwind CSS 3, shadcn/ui (new-york style) |
| API Layer | Next.js Edge Runtime API routes |
| External APIs | eBay Finding API (server-side proxy) |
| Database | None |
| Authentication | None |
| State Management | React hooks (useState, useCallback, useRef) |
| Build Status | **FAILS** (broken import path) |

---

## 2. Folder Responsibilities

```
/app/
  app/                    # Next.js App Router (NEW — post-migration)
    api/                  # Edge Runtime API routes
      health/route.ts     # GET /api/health
      search/route.ts     # POST /api/search (eBay proxy)
      search/comparables/ # POST /api/search/comparables
      search/status/      # GET /api/search/status
    layout.tsx            # Root layout (metadata, fonts, dark mode)
    page.tsx              # Home page (dynamic imports App from src/)
    globals.css           # Global styles (partial duplicate of src/App.css)

  lib/                    # Server-side shared libraries (NEW — post-migration)
    ebay-server.ts        # Server-side eBay API client (credentials via process.env)
    rate-limit.ts         # In-memory rate limiter (Map-based)
    validation.ts         # Zod v4 input validation schemas

  src/                    # React application source (ORIGINAL — from Vite era)
    App.tsx               # Main React component (search UI, features, footer)
    App.css               # Custom CSS (328 lines — duplicates globals.css)
    index.css             # shadcn/ui CSS variables
    main.tsx              # DEAD CODE — Vite entry point (createRoot)
    components/
      Header.tsx          # Navigation bar
      cards/DealCard.tsx  # Deal result card
      ui/                 # 53 shadcn/ui components (most unused)
      ui-custom/          # ScoreBadge, RiskBadge, SearchBar
    hooks/
      useSearch.ts        # Search state + orchestration (demo mode fallback)
      useDebounce.ts      # Debounce utility
      use-mobile.ts       # Mobile breakpoint detection
    sections/
      Hero.tsx            # Landing hero with search
      DealsGrid.tsx       # Results grid with infinite scroll
    services/
      api-client.ts       # HTTP client for Next.js API routes (CORRUPTED FILE)
      demo-data.ts        # Fake data generator for demo mode
      ebay/               # DEAD CODE — original client-side eBay API integration
        client.ts         # Direct eBay API calls (uses VITE_ env vars)
        config.ts         # eBay config from import.meta.env
        search.ts         # Client-side search/comparables
      scoring/
        index.ts          # Deal scoring engine (market value, deal score, seller risk)
    lib/
      concurrency.ts      # Promise concurrency limiter, retry, timeout utilities
      utils.ts            # cn() helper (clsx + tailwind-merge)
    types/
      index.ts            # Comprehensive TypeScript type definitions

  # Existing markdown docs (5 files with overlapping/contradictory content)
  ARCHITECTURE.md         # Describes Express backend (deleted during migration)
  CTO_AUDIT.md            # Pre-migration audit (still references Vite architecture)
  DEPLOY.md               # Next.js Vercel deployment guide
  DEPLOYMENT.md           # Vite static deployment guide (contradicts DEPLOY.md)
  REFACTOR_SUMMARY.md     # Migration changelog
  VERCEL_READY.md         # Deployment checklist
```

---

## 3. Data Flow

### Live Mode (eBay API configured)

```
User types search query
        |
        v
SearchBar.tsx (onSearch)
        |
        v
useSearch.ts -> getEbayStatus() -> GET /api/search/status
        |                               |
        |  (configured=true)            v
        |                          lib/ebay-server.ts -> process.env.EBAY_APP_ID
        |
        v
searchListings() -> POST /api/search
        |                |
        |                v
        |          lib/validation.ts (Zod parse)
        |          lib/rate-limit.ts (IP-based)
        |          lib/ebay-server.ts -> eBay Finding API
        |
        v
For each listing:
  getSoldComparables() -> POST /api/search/comparables
        |                        |
        |                        v
        |                  lib/ebay-server.ts -> eBay Finding API (findCompletedItems)
        |
        v
scoring/index.ts
  estimateMarketValue() -> weighted avg of comparables
  calculateDealScore()  -> profit/ROI/risk/confidence
  calculateSellerRisk() -> feedback/transactions analysis
        |
        v
ValuationResult[] -> DealsGrid -> DealCard[]
```

### Demo Mode (no eBay API key)

```
useSearch.ts -> getEbayStatus() -> fails or configured=false
        |
        v
demo-data.ts -> generateDemoValuations()
  (hardcoded templates, random pricing, inline scoring logic)
        |
        v
ValuationResult[] -> DealsGrid -> DealCard[]
```

### Concurrency Model (scoring/index.ts)

```
12 listings arrive
        |
        v
mapWithConcurrency(concurrency=4)
  -> 4 parallel: analyzeListing()
       -> withRetry(maxRetries=2)
            -> withTimeout(8s)
                 -> getComparables(title)
  -> next 4 when slots free
        |
        v
Results sorted by dealScore
```

---

## 4. Runtime Model

| Layer | Runtime | Notes |
|-------|---------|-------|
| Frontend | Browser (React 18 CSR) | Loaded via `dynamic()` with `ssr: false` |
| API Routes | Vercel Edge Runtime | `export const runtime = 'edge'` on all routes |
| Server Libs | Edge Runtime | `lib/` runs server-side only |
| Rate Limiter | In-memory Map | **Resets per Edge invocation** (effectively useless on Vercel) |

The entire React app is client-rendered. `app/page.tsx` uses `dynamic(() => import('@/App'), { ssr: false })` to bypass SSR entirely.

---

## 5. Deployment Model

### Target: Vercel (Serverless)

```
Vercel
  |-- Static: app/layout.tsx, app/page.tsx -> CDN-served HTML
  |-- Client: src/**  -> JS bundle (client-side React)
  |-- Edge Functions:
       |-- /api/search       (Edge Runtime)
       |-- /api/search/comparables
       |-- /api/search/status
       |-- /api/health
  |-- Server env: EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID
```

### Docker Compatibility (Secondary)

The app can run in Docker with a standard Node.js + Next.js setup. No database or external services are required beyond the eBay API. The Edge Runtime routes would need to be changed to `nodejs` runtime for non-Vercel deployments.

---

## 6. Risk Areas

### CRITICAL (Build Blockers)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Build fails: `Module not found: Can't resolve '@/App'`** | `app/page.tsx:11` | Cannot deploy. tsconfig `@/*` maps to `./*` but `App.tsx` lives at `src/App.tsx`. Need `@/src/App` or update tsconfig paths. |
| 2 | **Corrupted file: duplicate code with syntax error** | `src/services/api-client.ts:194` | Lines 194-221 are a corrupted duplicate of lines 156-193. Line 194 starts with `rn {` (truncated `return`). |

### HIGH (Security / Architecture)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 3 | **Dead client-side eBay API code still in bundle** | `src/services/ebay/*` | 3 files (client.ts, config.ts, search.ts) use `import.meta.env.VITE_*` for eBay credentials. Dead code but shipped in client bundle and a security anti-pattern. |
| 4 | **Massive code duplication** | `src/services/ebay/*` vs `lib/ebay-server.ts` | Identical eBay API logic exists in both server (`lib/`) and client (`src/services/ebay/`). ~500 duplicated lines. |
| 5 | **CSS duplication** | `src/App.css` (328 lines) vs `app/globals.css` (200 lines) | ~80% overlap. Both define the same CSS variables, animations, glass morphism, and utility classes. |
| 6 | **4 high-severity npm vulnerabilities** | `next`, `glob`, `@next/eslint-plugin-next` | CVE in Next.js image optimizer (DoS) and glob (command injection). |
| 7 | **Scoring logic duplicated in demo-data.ts** | `src/services/demo-data.ts:269-287` | Inline deal score calculation that drifts from the canonical `scoring/index.ts` implementation. |

### MEDIUM (Correctness / Config)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 8 | **Rate limiter is non-functional on Vercel Edge** | `lib/rate-limit.ts` | In-memory `Map` resets per cold start. On Edge, each invocation is isolated. Rate limiting does nothing. |
| 9 | **ESLint config references Vite plugins** | `eslint.config.js` | Imports `eslint-plugin-react-refresh` and `eslint-plugin-react-hooks` (not in devDependencies). Uses ESM `import` without `"type": "module"`. Will crash on `npm run lint`. |
| 10 | **No `.env.example` or `.env.local` in repo** | Root | README references `.env.example` but the file doesn't exist. New developers have no env var template. |
| 11 | **5 overlapping markdown docs with contradictory info** | Root `*.md` files | `ARCHITECTURE.md` describes Express (deleted). `DEPLOYMENT.md` describes Vite static deploy. `DEPLOY.md` describes Next.js. No single source of truth. |
| 12 | **`components.json` references wrong CSS file** | `components.json:8` | `"css": "src/index.css"` — shadcn will write styles here, but Next.js loads `app/globals.css`. |

### LOW (Optimization / Hygiene)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 13 | **53 shadcn/ui components, ~5 actually used** | `src/components/ui/` | Button, Badge, Input, Popover, Slider used. 48 components are dead weight (304KB source). |
| 14 | **`src/main.tsx` is dead code** | `src/main.tsx` | Vite entry point. Next.js doesn't use it. |
| 15 | **`Math.random()` for IDs** | `src/services/demo-data.ts` | `.substr(2, 9)` for demo IDs — collision-prone. |
| 16 | **Copyright year 2024** | `src/App.tsx:183` | Footer shows "2024 FlipFoundry". |
| 17 | **`next.config.js` uses CommonJS** | `next.config.js` | `module.exports` — functional but inconsistent with modern Next.js (ESM default since v13). |

---

## 7. AI-Generated Anti-Patterns Detected

| Pattern | Evidence | Files |
|---------|----------|-------|
| **Incomplete migration** | Vite artifacts left behind after Next.js migration. The migrator added Next.js files but didn't clean up the original Vite structure. | `src/main.tsx`, `src/services/ebay/*`, `eslint.config.js` |
| **Copy-paste duplication** | `lib/ebay-server.ts` is a near-exact copy of `src/services/ebay/search.ts` with minor adjustments. The types, parsing functions, condition mappings are duplicated line-by-line. | `lib/ebay-server.ts` vs `src/services/ebay/search.ts` |
| **File corruption** | `api-client.ts` has duplicate function definitions with a truncated `return` statement — characteristic of AI editor buffer overflow or merge conflict. | `src/services/api-client.ts:194` |
| **Documentation sprawl** | 6 markdown docs generated in sequence without consolidation. Each reflects a different point in the migration timeline. Some contradict each other. | `ARCHITECTURE.md`, `CTO_AUDIT.md`, `DEPLOY.md`, `DEPLOYMENT.md`, `REFACTOR_SUMMARY.md`, `VERCEL_READY.md` |
| **Over-provisioned UI library** | 53 shadcn/ui components installed, ~5 used. AI scaffold tools often dump the entire library. | `src/components/ui/` |
| **Placeholder code left as production** | `window.open('https://github.com', '_blank')` and `window.open('https://twitter.com', '_blank')` — generic social links that go nowhere specific. | `src/components/Header.tsx:73-85` |

---

## 8. Structural Improvement Recommendations (NOT IMPLEMENTED)

1. **Fix the build**: Update `app/page.tsx` import to `@/src/App` or adjust tsconfig paths to map `@/*` -> `./src/*`.
2. **Delete dead code**: Remove `src/services/ebay/`, `src/main.tsx`, and deduplicate CSS.
3. **Fix corrupted file**: Remove duplicate code block in `src/services/api-client.ts`.
4. **Consolidate docs**: Replace 6 markdown files with a single `ARCHITECTURE.md` and `DEPLOY.md`.
5. **Prune shadcn/ui**: Remove unused components (48 of 53).
6. **Replace rate limiter**: Use Upstash Redis or Vercel KV for persistent rate limiting on Edge.
7. **Create `.env.example`**: Document required server env vars.
8. **Fix ESLint config**: Replace Vite-specific config with `eslint-config-next`.
9. **Update Next.js**: Upgrade from 14.2.35 to patch high-severity CVEs.
