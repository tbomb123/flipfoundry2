# FlipFoundry - PRD & Audit Record

## Original Problem Statement
Complete architectural audit → cleanup → security patching → production hardening → launch readiness (Next.js 15, auth, Vercel checklist) → preview deployment fix → eBay compliance endpoint → Saved Searches system with email alerts.

## Application Overview
FlipFoundry: AI-powered eBay arbitrage platform. Next.js 15.5.12, React 18, TypeScript, Tailwind, shadcn/ui. Edge Runtime API routes with Upstash Redis caching/rate limiting, Sentry monitoring, API key auth. **Now with PostgreSQL (Neon) for persistent storage and Resend for email alerts.**

## Implementation Timeline

### Phase 1-7: Foundation (Previous Sessions)
- Audit, cleanup, security patching, hardening, launch readiness, preview fix, eBay compliance

### Phase 8: Grade Estimation Feature (February 2026)
- AI-powered grade estimation for raw sports cards
- Pluggable provider system (Ximilar + Mock)
- Full observability (logging + Redis counters)
- Feature flag controlled

### Phase 9: Saved Searches System (February 2026)
- PostgreSQL database layer (Prisma ORM + Neon)
- Full CRUD API for saved searches
- Alert worker pipeline
- Resend email integration
- Frontend UI (quick-save + dashboard)

## Current Status (February 2026)
- **Build**: ✅ Passing
- **Tests**: 51 tests (Vitest + Playwright)
- **Database**: Prisma schema + migrations ready (awaiting DATABASE_URL)
- **Next Step**: Run Prisma migration, configure Resend, test full flow

## Production Readiness: 9.5/10

## Key API Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/search` | POST | Yes | eBay product search |
| `/api/search/status` | GET | Yes | eBay API connection status |
| `/api/search/comparables` | POST | Yes | Comparable sold items |
| `/api/search/cache/stats` | GET | Yes | Redis cache metrics |
| `/api/ebay/account-deletion` | GET/POST | No | eBay compliance endpoint |
| `/api/cards/estimate-grade` | GET/POST | No | AI grade estimation |
| `/api/grade/stats` | GET/DELETE | Yes | Grade estimation metrics |
| `/api/saved-searches` | GET/POST | Yes | List/create saved searches |
| `/api/saved-searches/[id]` | GET/PATCH/DELETE | Yes | Single search operations |
| `/api/alerts/worker` | GET/POST | Yes | Trigger alert worker |

## Database Schema (PostgreSQL)

### saved_searches
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | API key (future: user UUID) |
| name | VARCHAR(255) | Search name |
| query | TEXT | Search keywords |
| filters | JSONB | Price range, category, condition |
| alert_enabled | BOOLEAN | Enable email alerts |
| minimum_score | INT | Deal score threshold (default: 70) |
| last_run_at | TIMESTAMP | Last worker execution |
| created_at | TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP | Updated timestamp |

### alert_history
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| saved_search_id | UUID | FK to saved_searches |
| item_id | TEXT | eBay item ID |
| deal_score | INT | Deal score when alert sent |
| alert_type | TEXT | email/sms/push |
| sent_at | TIMESTAMP | When alert was sent |

## Saved Searches Architecture

```
User saves search
       ↓
POST /api/saved-searches (no eBay call)
       ↓
Stored in PostgreSQL
       ↓
Worker cron job (POST /api/alerts/worker)
       ↓
For each search with alerts enabled:
  1. Execute eBay search
  2. Filter by minimum_score
  3. Dedupe against alert_history
  4. Send email via Resend
  5. Record in alert_history
```

## New Files Created (Phase 9)

### Backend
- `/lib/db.ts` - Prisma client singleton
- `/lib/saved-searches.ts` - Saved searches service
- `/lib/alert-history.ts` - Alert history service
- `/lib/email.ts` - Resend email service
- `/lib/alert-worker.ts` - Background worker
- `/app/api/saved-searches/route.ts` - List/create API
- `/app/api/saved-searches/[id]/route.ts` - Single search API
- `/app/api/alerts/worker/route.ts` - Worker trigger API
- `/prisma/schema.prisma` - Database schema
- `/prisma/migrations/` - Migration files

### Frontend
- `/src/hooks/useSavedSearches.ts` - React hook
- `/src/components/ui-custom/SaveSearchButton.tsx` - Quick-save button
- `/app/saved-searches/page.tsx` - Dashboard page
- `/src/components/ui/switch.tsx` - UI component
- `/src/components/ui/card.tsx` - UI component
- `/src/components/ui/dialog.tsx` - UI component
- `/src/components/ui/alert-dialog.tsx` - UI component
- `/src/components/ui/label.tsx` - UI component

## Required Environment Variables (New)

```env
# PostgreSQL (Neon)
DATABASE_URL=postgresql://user:pass@project.neon.tech/dbname?sslmode=require

# Resend Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=alerts@yourdomain.com
```

## Migration Commands

```bash
# Apply migration (run in environment with DATABASE_URL)
npx prisma migrate deploy

# Or for development
npx prisma migrate dev

# View database in browser
npx prisma studio
```

## Remaining to 10/10
1. ~~Database layer (user accounts, saved searches)~~ ✅ Done
2. Run migration on production database
3. Configure Resend email service
4. Test alert worker end-to-end
5. Nonce-based CSP
6. Full user authentication (email/password)

## Key Documentation
- `/VERCEL_PRODUCTION_SETUP.md` - Deployment guide
- `/AUTH_SETUP.md` - API key authentication
- `/TESTING_SETUP.md` - Test suite
- `/FEATURE_FLAGS.md` - Feature flag guide
- `/.env.example` - Environment variables template
