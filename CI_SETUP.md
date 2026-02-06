# CI/CD Setup

## Pipeline: `.github/workflows/ci.yml`

### Triggers
- Push to `main` or `architecture-cleanup`
- Pull requests targeting `main`

### Jobs

**quality** (runs first):
1. `npm ci` — install deps
2. `npx tsc --noEmit` — typecheck
3. `npm run lint` — ESLint
4. `npm test` — Vitest unit + integration tests (37 tests)
5. `npm run build` — production build

**e2e** (runs after quality passes):
1. Install Playwright + Chromium
2. Build production bundle
3. `npm run test:e2e` — Playwright E2E tests

### Run Locally
```bash
npm test           # Unit + integration
npm run test:e2e   # E2E (starts dev server automatically)
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm run build      # Production build
```

### Fail Conditions
Any step failure blocks the pipeline. E2E only runs after quality passes.
