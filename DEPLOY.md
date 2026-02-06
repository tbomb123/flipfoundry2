# FlipFoundry - Vercel Deployment Guide

## Quick Deploy (3 Steps)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flipfoundry.git
git push -u origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Framework Preset: **Next.js**

### 3. Set Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables, add:

| Name | Value | Required |
|------|-------|----------|
| `EBAY_APP_ID` | your_ebay_app_id | ✅ Yes |
| `EBAY_CERT_ID` | your_ebay_cert_id | ❌ Optional |
| `EBAY_DEV_ID` | your_ebay_dev_id | ❌ Optional |
| `EBAY_SANDBOX` | true | ✅ Yes (for testing) |
| `EBAY_SITE_ID` | 0 | ✅ Yes (0=US) |

Click **Deploy**.

---

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/flipfoundry.git
cd flipfoundry

# Install dependencies
npm install

# Create local env file
cp .env.example .env.local

# Edit .env.local with your eBay credentials
# EBAY_APP_ID=your_app_id
# EBAY_SANDBOX=true

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Vercel (Serverless)            │
│  ┌─────────────┐    ┌────────────────┐  │
│  │  Next.js    │    │  API Routes    │  │
│  │  (React)    │───▶│  (/api/search) │  │
│  └─────────────┘    └───────┬────────┘  │
│                             │           │
│              ┌──────────────┴───────┐   │
│              │  lib/ebay-server.ts  │   │
│              │  (server-only creds) │   │
│              └──────────────┬───────┘   │
└─────────────────────────────┼───────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    eBay API     │
                    └─────────────────┘
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search` | POST | Search eBay listings |
| `/api/search/comparables` | POST | Get sold comparables |
| `/api/search/status` | GET | Check eBay API status |
| `/api/health` | GET | Health check |

---

## Environment Variables Reference

### Required
- `EBAY_APP_ID` - Your eBay App ID from developer.ebay.com

### Optional
- `EBAY_CERT_ID` - eBay Cert ID (for OAuth)
- `EBAY_DEV_ID` - eBay Dev ID
- `EBAY_SANDBOX` - Use sandbox (true/false)
- `EBAY_SITE_ID` - eBay site (0=US, 3=UK, 77=DE)

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### eBay API Not Working
1. Check `EBAY_APP_ID` is set in Vercel
2. Visit `/api/search/status` to verify
3. Check Vercel logs: Dashboard → Functions

### Rate Limiting Issues
- Default: 20 requests per 5 minutes per IP
- In-memory store resets on cold starts
- For production scale, add Upstash Redis

---

## Production Checklist

- [ ] `EBAY_APP_ID` set in Vercel
- [ ] `EBAY_SANDBOX=false` for production
- [ ] Custom domain configured (optional)
- [ ] Analytics added (optional)

---

**Deploy URL:** `https://your-project.vercel.app`
