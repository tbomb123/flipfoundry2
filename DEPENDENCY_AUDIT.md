# FlipFoundry - Dependency Audit

**Audit Date:** January 2026
**Package Manager:** npm
**Total Dependencies:** 522 (installed)

---

## 1. Security Vulnerabilities

**`npm audit` reports 4 high-severity vulnerabilities:**

| Package | Version | Severity | CVE / Advisory | Description |
|---------|---------|----------|----------------|-------------|
| `next` | 14.2.35 | HIGH | [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) | Self-hosted apps vulnerable to DoS via Image Optimizer `remotePatterns` config |
| `next` | 14.2.35 | HIGH | [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) | HTTP request deserialization DoS via insecure React Server Components |
| `glob` | 10.2.0-10.4.5 | HIGH | [GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) | Command injection via `-c/--cmd` with `shell:true` |
| `@next/eslint-plugin-next` | 14.x | HIGH | Transitive | Depends on vulnerable `glob` |

**Fix path:** `npm audit fix --force` upgrades to `next@16.x` and `eslint-config-next@16.x` (breaking changes). A safer path is upgrading to `next@14.2.x` (latest patch) or `next@15.x` (LTS).

---

## 2. Outdated Packages

| Package | Current | Latest | Breaking? | Risk | Notes |
|---------|---------|--------|-----------|------|-------|
| `next` | 14.2.35 | 16.1.6 | YES | HIGH | Major version jump. v15+ has React 19 requirement, new APIs. |
| `react` | 18.3.1 | 19.2.4 | YES | HIGH | React 19 has breaking changes (forwardRef, context API). |
| `react-dom` | 18.3.1 | 19.2.4 | YES | HIGH | Must match React version. |
| `eslint` | 8.57.1 | 9.39.2 | YES | MEDIUM | Flat config is default in v9. Current config uses v9 imports but v8 runtime. |
| `eslint-config-next` | 14.2.35 | 16.1.6 | YES | MEDIUM | Tied to Next.js version. |
| `tailwindcss` | 3.4.19 | 4.1.18 | YES | HIGH | Tailwind v4 has completely new config system. |
| `recharts` | 2.15.4 | 3.7.0 | YES | LOW | Not currently used in any component (installed but unused). |
| `@types/node` | 20.19.32 | 25.2.1 | YES | LOW | Type definitions only. |
| `@types/react` | 18.3.28 | 19.2.13 | YES | LOW | Must match React version. |
| `@types/react-dom` | 18.3.7 | 19.2.3 | YES | LOW | Must match React DOM version. |
| `lucide-react` | 0.562.0 | 0.563.0 | NO | NONE | Patch update. |

**Recommendation:** Do NOT upgrade to Next 16 / React 19 / Tailwind 4 in a single pass. First, patch Next.js within v14 to resolve security CVEs, then plan a staged migration.

---

## 3. Unnecessary / Unused Libraries

### 3.1 Unused Production Dependencies

| Package | Evidence | Recommendation |
|---------|----------|----------------|
| `recharts` (2.15.4) | Zero imports across entire codebase. `grep -r "recharts" src/ app/ lib/` returns nothing. | **REMOVE** |
| `@hookform/resolvers` (5.2.2) | No imports found. | **REMOVE** |
| `react-hook-form` (7.70.0) | No imports found. No forms use `useForm()`. | **REMOVE** |
| `react-day-picker` (9.13.0) | Only imported by `src/components/ui/calendar.tsx` which is an unused shadcn component. | **REMOVE** (with calendar.tsx) |
| `embla-carousel-react` (8.6.0) | Only imported by `src/components/ui/carousel.tsx` (unused). | **REMOVE** (with carousel.tsx) |
| `input-otp` (1.4.2) | Only imported by `src/components/ui/input-otp.tsx` (unused). | **REMOVE** (with input-otp.tsx) |
| `react-resizable-panels` (4.2.2) | Only imported by `src/components/ui/resizable.tsx` (unused). | **REMOVE** (with resizable.tsx) |
| `cmdk` (1.1.1) | Only imported by `src/components/ui/command.tsx` (unused). | **REMOVE** (with command.tsx) |
| `vaul` (1.1.2) | Only imported by `src/components/ui/drawer.tsx` (unused). | **REMOVE** (with drawer.tsx) |
| `next-themes` (0.4.6) | Zero imports. Dark mode is hardcoded in `layout.tsx` (`className="dark"`). | **REMOVE** |

### 3.2 Unused shadcn/ui Components (48 of 53)

**Used components** (5): `button.tsx`, `badge.tsx`, `input.tsx`, `popover.tsx`, `slider.tsx`

**Unused components** (48) — these are installed but never imported by any application code:

```
accordion, alert, alert-dialog, aspect-ratio, avatar, breadcrumb,
button-group, calendar, card, carousel, chart, checkbox, collapsible,
command, context-menu, dialog, drawer, dropdown-menu, empty, field,
form, hover-card, input-group, input-otp, item, kbd, label, menubar,
navigation-menu, pagination, progress, radio-group, resizable,
scroll-area, select, separator, sheet, sidebar, skeleton, sonner,
spinner, switch, table, tabs, textarea, toggle, toggle-group, tooltip
```

**Total dead UI component disk usage:** ~304KB source (will increase bundle if tree-shaking is imperfect).

### 3.3 Dead Source Directories

| Path | Status | Recommendation |
|------|--------|----------------|
| `src/services/ebay/` (3 files) | Dead code. Superseded by `lib/ebay-server.ts`. Zero imports from active code. | **DELETE** entire directory |
| `src/main.tsx` | Vite entry point. Next.js doesn't use it. | **DELETE** |

---

## 4. Deprecated Packages (npm warnings)

| Package | Deprecation | Recommendation |
|---------|-------------|----------------|
| `inflight@1.0.6` | Leaks memory. Transitive dep of `glob`. | Resolves when `glob` is updated |
| `rimraf@3.0.2` | Replaced by v4+. Transitive dep. | Resolves with `glob` update |
| `@humanwhocodes/object-schema@2.0.3` | Use `@eslint/object-schema`. | Resolves with ESLint v9 upgrade |
| `@humanwhocodes/config-array@0.13.0` | Use `@eslint/config-array`. | Resolves with ESLint v9 upgrade |
| `glob@7.2.3` & `glob@10.3.10` | Unsupported. Security vulnerabilities. | Update to `glob@11+` |
| `eslint@8.57.1` | Version no longer supported. | Upgrade to v9+ (breaking) |

---

## 5. Dependency Conflict Risks

### 5.1 ESLint Configuration vs Runtime Mismatch

The `eslint.config.js` uses ESM flat config syntax:
```javascript
import js from '@eslint/js'               // ESM import
import { defineConfig } from 'eslint/config'  // ESLint v9 API
```

But:
- `package.json` does NOT have `"type": "module"` (defaults to CommonJS)
- ESLint v8 is installed (v9 required for `eslint/config` import)
- `eslint-plugin-react-refresh` and `eslint-plugin-react-hooks` are imported but NOT in `devDependencies`

**Result:** `npm run lint` will crash.

### 5.2 Zod v4 API Compatibility

`zod@4.3.6` is installed. Zod v4 introduced breaking changes from v3. The validation code in `lib/validation.ts` uses APIs that exist in both versions (`.safeParse()`, `.transform()`, `.string()`, `.number()`, etc.) and appears compatible. However, error message formats changed in v4 — response payloads that include `parseResult.error.issues` may have different shapes than v3 consumers expect.

### 5.3 Radix UI Overprovisioning

17 `@radix-ui/*` packages are installed. Only `@radix-ui/react-popover`, `@radix-ui/react-slider`, and `@radix-ui/react-slot` are used by active components. The remaining 14 are transitive deps of unused shadcn/ui components.

---

## 6. Supply Chain Summary

| Metric | Value |
|--------|-------|
| Total installed packages | 522 |
| Direct production deps | 30 |
| Direct dev deps | 10 |
| High-severity vulnerabilities | 4 |
| Deprecated transitive deps | 6 |
| Unused direct production deps | ~10 |
| Dead shadcn/ui components | 48 of 53 |

**Recommendation:** Remove unused dependencies, upgrade Next.js to patch CVEs, and fix ESLint config before any production deployment.
