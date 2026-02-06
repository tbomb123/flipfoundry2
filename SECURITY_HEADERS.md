# Security Headers

## Current Status

CSP and security headers are **NOT applied via middleware** — they caused blank pages in the Emergent preview iframe environment. The middleware only handles API key authentication.

## Production Deployment (Vercel)

For production, add security headers via `vercel.json` or Vercel dashboard headers config:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://i.ebayimg.com https://*.ebay.com; connect-src 'self' https://svcs.ebay.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }
      ]
    }
  ]
}
```

This keeps the preview environment clean while hardening production.

| Header | Value | Rationale |
|--------|-------|-----------|
| `Content-Security-Policy` | See below | Prevents XSS, clickjacking, data injection |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing attacks |
| `X-Frame-Options` | `DENY` | Prevents clickjacking (redundant with CSP `frame-ancestors` for older browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends origin only on cross-origin requests, full URL on same-origin |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Disables unnecessary browser APIs |
| `X-DNS-Prefetch-Control` | `on` | Enables DNS prefetching for external resources (eBay images) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS for 1 year |

## CSP Directives

```
default-src 'self'
script-src 'self' 'unsafe-eval' 'unsafe-inline'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: https://i.ebayimg.com https://upload.wikimedia.org https://*.ebay.com
connect-src 'self' {sentry_host} https://svcs.ebay.com https://svcs.sandbox.ebay.com
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

### Directive Rationale

| Directive | Why |
|-----------|-----|
| `script-src 'unsafe-eval' 'unsafe-inline'` | Required by Next.js dev mode and dynamic imports. Can be tightened with nonce-based CSP in production. |
| `style-src 'unsafe-inline'` | Required by Tailwind CSS runtime and inline styles from shadcn/ui |
| `img-src data:` | For base64 inline images (loading placeholders) |
| `img-src https://i.ebayimg.com https://*.ebay.com` | eBay product images |
| `connect-src {sentry_host}` | Dynamically added when Sentry DSN is configured |
| `frame-ancestors 'none'` | CSP-level clickjacking prevention (stronger than X-Frame-Options) |

## What's NOT Included (and Why)

| Header | Reason |
|--------|--------|
| `X-XSS-Protection` | Deprecated. Modern browsers use CSP instead. |
| `X-Powered-By` | Next.js removes it by default. |
| `Cross-Origin-Embedder-Policy` | Would break eBay image loading. |
| `Cross-Origin-Opener-Policy` | Not needed — app doesn't open cross-origin windows. |

## Verification

```bash
curl -sI https://your-domain.vercel.app/ | grep -i "content-security\|x-content\|x-frame\|referrer\|permissions\|strict-trans"
```
