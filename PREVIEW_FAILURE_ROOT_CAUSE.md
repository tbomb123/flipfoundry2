# Preview Failure Root Cause Analysis

**Date:** January 2026
**Status:** ROOT CAUSE CONFIRMED — FIXED AND VERIFIED

---

## Failing Component: SUPERVISOR PROCESS MANAGEMENT

**NOT a Next.js 15 issue. NOT a middleware issue. NOT an env var issue.**

The failure was in the Emergent platform's process supervisor, which could not start the application because the expected directory structure did not exist.

---

## Exact Error Messages

### Backend (port 8001)
```
supervisor: couldn't chdir to /app/backend: ENOENT
supervisor: child process was not spawned
```

### Frontend (port 3000)
```
supervisor: couldn't chdir to /app/frontend: ENOENT
supervisor: child process was not spawned
```

---

## Root Cause

The Emergent platform supervisor expects a **two-process architecture**:

| Process | Expected Directory | Expected Command | Port |
|---------|-------------------|------------------|------|
| Backend | `/app/backend/` | `uvicorn server:app --port 8001` | 8001 |
| Frontend | `/app/frontend/` | `yarn start` | 3000 |

The imported FlipFoundry repository is a **Next.js monolith** at `/app/` root. Both directories were absent.

---

## Fix Applied

| File | Purpose |
|------|---------|
| `/app/frontend/package.json` | Runs `next dev --port 3000` from `/app/` root |
| `/app/backend/server.py` | FastAPI reverse proxy: port 8001 → port 3000 (Next.js) |
| `/app/backend/.env` | Platform-required env file |
| `/app/frontend/.env` | Platform-required env file |

### Architecture After Fix

```
Browser → Emergent Ingress
              |
              ├── /api/*    → port 8001 (FastAPI proxy) → localhost:3000 (Next.js)
              └── /*        → port 3000 (Next.js dev)   → serves app directly
```

---

## Verification

| Check | Result |
|-------|--------|
| Supervisor: both processes RUNNING | PASS |
| Frontend loads (port 3000) | PASS — HTTP 200, 21KB |
| Backend proxy (port 8001) | PASS — /api/health returns ok |
| API routes via proxy | PASS — search, status, cache/stats all work |
| Security headers | PASS — CSP, HSTS, X-Frame, Referrer, Permissions |
| Unit tests | PASS — 51/51 |
| Testing agent | PASS — 100% backend, frontend, integration |
| Demo search in UI | PASS — 12 demo results returned |

---

## Severity: RESOLVED

The preview deployment is fully operational.
