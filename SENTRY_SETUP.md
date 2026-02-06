# Sentry Setup

## Architecture

```
Client (Browser)                    Server (Edge/Node)
       |                                  |
  instrumentation-client.ts          instrumentation.ts
  NEXT_PUBLIC_SENTRY_DSN             → sentry.server.config.ts (Node)
       |                             → sentry.edge.config.ts (Edge)
       |                                  |
  Captures:                          Captures:
  - React component errors           - API route exceptions
  - Unhandled promises               - Server-side errors
  - Console errors                   - Edge Runtime errors
       |                                  |
       └──── Both report to ────→ Sentry Dashboard
```

## Files

| File | Purpose |
|------|---------|
| `instrumentation-client.ts` | Client-side Sentry init (uses `NEXT_PUBLIC_SENTRY_DSN`) |
| `instrumentation.ts` | Server bootstrap — loads Node or Edge config based on runtime |
| `sentry.server.config.ts` | Node.js runtime Sentry init (uses `SENTRY_DSN`) |
| `sentry.edge.config.ts` | Edge runtime Sentry init (uses `SENTRY_DSN`) |
| `app/global-error.tsx` | React error boundary — catches and reports component crashes |
| `next.config.js` | Wraps config with `withSentryConfig` when DSN is set |

## Environment Variables

```bash
# Server-side (secret)
SENTRY_DSN=https://xxxxx@o12345.ingest.us.sentry.io/67890
SENTRY_ORG=your-org
SENTRY_PROJECT=flipfoundry
SENTRY_AUTH_TOKEN=sntrys_xxxxx  # For source map uploads only

# Client-side (public)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@o12345.ingest.us.sentry.io/67890
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0

# Same DSN for both — Sentry DSN is public by design (auth is project-level)
```

## Tracing Configuration

| Runtime | Sample Rate (Prod) | Sample Rate (Dev) |
|---------|-------------------|-------------------|
| Client | 10% | 100% |
| Server (Node) | 10% | 100% |
| Edge | 5% | 100% |

Low overhead in production. Full tracing in development.

## Setup Steps

1. Create project at [sentry.io](https://sentry.io)
2. Copy DSN from Project Settings → Client Keys
3. Set env vars in Vercel project settings
4. Deploy — errors will appear in Sentry dashboard

## Notes

- Sentry is disabled when `SENTRY_DSN` is not set (safe for local dev)
- Source map upload requires `SENTRY_AUTH_TOKEN` (CI/CD only)
- The Prisma OpenTelemetry warning in build output is harmless (Sentry bundles it for optional Prisma tracing)
