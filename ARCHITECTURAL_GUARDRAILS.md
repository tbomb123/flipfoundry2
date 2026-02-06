# FlipFoundry - Architectural Guardrails

**Date:** January 2026
**Status:** Recommendations only — not yet implemented

---

## 1. Dependency Governance

### Package Addition Policy

- **Rule:** No new production dependency without documented justification (what it does, why native/existing solutions are insufficient, bundle impact).
- **Enforcement:** Require PR review for any `package.json` change. Add a `DEPENDENCY_DECISIONS.md` log for audit trail.
- **Tool:** Add [Knip](https://knip.dev/) to CI to detect unused dependencies automatically. Current cleanup removed 10 — this prevents recurrence.

### Version Pinning

- **Rule:** Pin exact versions for critical packages (`next`, `react`, `typescript`). Use ranges (`^`) only for leaf dependencies.
- **Enforcement:** `npm config set save-exact true` for core packages.
- **Rationale:** The Zod v3→v4 jump demonstrates why ranges are dangerous for packages with breaking changes.

### Automated Updates

- **Tool:** Add Renovate or Dependabot with these rules:
  - Auto-merge: patch updates for devDependencies
  - PR required: minor updates
  - Manual review: major updates
  - Schedule: weekly, grouped by ecosystem

### Audit Cadence

- **Rule:** Run `npm audit` in CI. Fail build on high-severity vulnerabilities.
- **Enforcement:** Add to GitHub Actions or Vercel build command:
  ```bash
  npm audit --audit-level=high && npm run build
  ```

---

## 2. Lint Enforcement

### ESLint Configuration

Current: `.eslintrc.json` with `next/core-web-vitals`. Recommended additions:

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "import/no-duplicates": "error"
  }
}
```

### Pre-commit Hook

- **Tool:** Add `lint-staged` + `husky`:
  ```bash
  npx husky init
  ```
- **Hook:** Run ESLint + TypeScript check on staged files only (fast feedback).
  ```json
  { "*.{ts,tsx}": ["eslint --fix", "tsc --noEmit"] }
  ```

### Import Boundaries

- **Rule:** `lib/` files must NEVER import from `src/`. `src/` may import from `lib/` only via API client (`src/services/api-client.ts`).
- **Enforcement:** Add ESLint `no-restricted-imports` rule:
  ```json
  {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["@/src/*"],
        "importNames": ["*"],
        "message": "Server code (lib/) must not import client code (src/)."
      }]
    }]
  }
  ```
  Apply only to files in `lib/` and `app/api/`.

---

## 3. TypeScript Strictness

### Current: Moderate
The `tsconfig.json` has `"strict": true` which is good. Recommended additions:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  }
}
```

### Key Additions Explained

| Option | Why |
|--------|-----|
| `noUncheckedIndexedAccess` | Arrays/objects return `T \| undefined` — prevents unchecked `.property` access on dynamic data (common bug with eBay API responses) |
| `exactOptionalPropertyTypes` | Distinguishes `{ x?: string }` from `{ x: string \| undefined }` — catches data modeling bugs |
| `forceConsistentCasingInFileNames` | Prevents case-sensitivity bugs between macOS (case-insensitive) and Linux (case-sensitive) deploys |

### Migration Strategy

Enable one option at a time. Fix all resulting errors before enabling the next. Order: `forceConsistentCasingInFileNames` → `noUncheckedIndexedAccess` → `exactOptionalPropertyTypes`.

---

## 4. Testing Strategy

### Recommended Stack

| Layer | Tool | Target Coverage |
|-------|------|----------------|
| Unit | Vitest | Scoring engine, validation, cache key generation |
| Integration | Vitest + MSW | API routes (mock eBay responses) |
| E2E | Playwright | Search flow, demo mode, error states |
| Visual regression | Playwright screenshots | Landing page, deal cards |

### Test File Conventions

```
src/
  services/
    scoring/
      index.ts
      index.test.ts       ← co-located unit test
  hooks/
    useSearch.ts
    useSearch.test.ts      ← co-located hook test
app/
  api/
    search/
      route.ts
      route.test.ts        ← co-located integration test
tests/
  e2e/
    search-flow.spec.ts    ← E2E tests
    demo-mode.spec.ts
```

### CI Test Gates

- **Rule:** All PRs must pass: lint → type-check → unit tests → integration tests.
- **E2E:** Run on merge to main only (slower, more expensive).
- **Coverage:** Enforce minimum 60% coverage threshold. Increase by 5% per quarter.

---

## 5. CI/CD Protections

### Recommended GitHub Actions Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build

  e2e:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build && npm run test:e2e
```

### Branch Protection Rules

- **main:** Require PR, require CI pass, require 1 approval, no force push.
- **architecture-*:** Require CI pass.
- **feature-*:** Require lint + type-check pass.

### Deployment Gates

- Vercel Preview: auto-deploy all PRs (built-in).
- Vercel Production: deploy only from `main` after CI passes.
- Add deployment preview comment bot for visual review.

---

## 6. Framework Lock-in Guidance

### Single Runtime Rule

- **Rule:** The project uses **Next.js App Router** as its sole framework and build system. No Vite, no Express, no standalone React builds.
- **Enforcement:** Add a CI check that fails if `vite.config`, `webpack.config`, or `express` appear in the codebase:
  ```bash
  ! grep -r "vite.config\|webpack.config\|require('express')" --include="*.ts" --include="*.js" .
  ```

### Entry Point Rule

- **Rule:** The application has exactly ONE entry point: `app/layout.tsx`. There must never be a `main.tsx`, `index.html`, or standalone React `createRoot` call.
- **Enforcement:** Knip (dead code detector) will flag unused entry points.

### API Route Rule

- **Rule:** All backend logic runs in Next.js API routes (`app/api/*/route.ts`). No separate backend server.
- **Rationale:** Prevents the Express/Vite split that caused the original architecture crisis.

---

## 7. Preventing Multiple Runtimes or Bundlers

### Detection Checklist (add to PR template)

- [ ] Does this PR add a new build tool or bundler? (webpack, vite, esbuild, swc config)
- [ ] Does this PR add a new server runtime? (express, fastify, hono)
- [ ] Does this PR add client-side environment variables? (`NEXT_PUBLIC_*`)
- [ ] Does this PR add a new CSS preprocessor? (sass, less, styled-components)

### Automated Detection

Add to CI:
```bash
# Fail if duplicate bundler configs appear
test ! -f vite.config.ts
test ! -f vite.config.js
test ! -f webpack.config.js
test ! -f webpack.config.ts
```

---

## 8. Refactor Approval Guidelines

### When Refactoring is Warranted

| Trigger | Action |
|---------|--------|
| Bug in shared logic | Fix the bug. Refactoring is NOT required. |
| Performance regression (measured) | Refactor only the measured bottleneck. |
| New feature requires architectural change | Write RFC first. Get approval. |
| "This code could be cleaner" | **STOP.** Not sufficient justification. |
| Dependency deprecation (security) | Upgrade in isolation. Test before merge. |

### Refactor RFC Template

For any structural change (moving files, changing module boundaries, introducing new patterns):

1. **What:** Describe the change in 2-3 sentences.
2. **Why:** Link to the specific problem (bug, performance metric, feature requirement).
3. **Blast radius:** List every file that changes.
4. **Rollback plan:** How to revert if it breaks.
5. **Test plan:** How to verify correctness.

### Anti-Patterns to Reject

- Refactoring "while you're in there" alongside feature work (mixes concerns in PRs)
- Introducing abstractions for one use case (premature abstraction)
- Replacing working patterns with "better" patterns without measured benefit
- AI-scaffolded rewrites that duplicate or replace existing logic without cleanup

---

## Summary

These guardrails address the root causes of the architectural drift discovered in the initial audit:

| Root Cause | Guardrail |
|------------|-----------|
| Vite artifacts left behind after migration | Single Runtime Rule + CI detection |
| 48 unused shadcn/ui components | Knip dead code detection |
| 10 unused npm packages | Dependency governance + Knip |
| 5 contradictory markdown docs | PR template checklist |
| Corrupted file from AI editing | Pre-commit hooks + lint-staged |
| No tests to catch regressions | Testing strategy + CI gates |
