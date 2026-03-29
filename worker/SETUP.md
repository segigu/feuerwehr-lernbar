# MTA Q&A Worker — Setup Guide

## Prerequisites

- Node.js 20+
- npm
- Cloudflare account (free, no credit card needed)

---

## Step 1: Cloudflare Account

1. Go to **dash.cloudflare.com** → Sign Up
2. Confirm your email
3. Note your **Account ID** — visible on the dashboard right sidebar, or in the URL: `dash.cloudflare.com/XXXXXXX`

## Step 2: Create API Token

1. Dashboard → profile icon (top right) → **My Profile**
2. Left sidebar → **API Tokens**
3. **Create Token** → use template **"Edit Cloudflare Workers"**
4. Add two more permissions: **Account → Workers AI → Edit** and **Account → Vectorize → Edit**
5. Continue → Create Token
6. **Copy the token** — it is shown only once

## Step 3: Login via CLI

```bash
wrangler login
```

Browser opens — log in and authorize. Verify:

```bash
wrangler whoami
```

## Step 4: Create Vectorize Index

```bash
cd worker
wrangler vectorize create mta-lessons --dimensions=1024 --metric=cosine
```

This is a one-time setup. The index name `mta-lessons` matches `wrangler.toml`.

## Step 5: Deploy Worker

```bash
cd worker
npm install
wrangler deploy
```

Note the URL printed at the end, e.g. `https://mta-qa.YOUR-SUBDOMAIN.workers.dev`

Verify:

```bash
curl https://mta-qa.YOUR-SUBDOMAIN.workers.dev/api/health
# → {"status":"ok"}
```

## Step 6: Ingest Lesson Content

```bash
cd worker
CLOUDFLARE_ACCOUNT_ID=YOUR_ACCOUNT_ID \
CLOUDFLARE_API_TOKEN=YOUR_API_TOKEN \
npx tsx scripts/ingest.ts
```

This extracts German text from all 17 lessons + questions, embeds them via BGE-M3, and uploads to Vectorize. Takes ~1-2 minutes.

Re-run this whenever lesson content changes. The script uses upsert — safe to run repeatedly.

## Step 7: Test

```bash
curl -X POST https://mta-qa.YOUR-SUBDOMAIN.workers.dev/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Was sind die Pflichtaufgaben der Feuerwehr?"}'
```

## Step 8: Connect Telegram Bot

Add to `bot/.env`:

```
QA_WORKER_URL=https://mta-qa.YOUR-SUBDOMAIN.workers.dev
```

Restart the bot: `cd bot && npm run dev`

## Step 9: Connect PWA

Create `webapp/.env.local`:

```
VITE_QA_WORKER_URL=https://mta-qa.YOUR-SUBDOMAIN.workers.dev
```

For production (GitHub Pages), add `VITE_QA_WORKER_URL` as a GitHub Actions secret (Settings → Secrets → Actions → New repository secret).

---

## GitHub Secrets Required

For automated re-indexing on push (see `.github/workflows/deploy.yml`):

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | API token from Step 2 |
| `CLOUDFLARE_API_TOKEN_DEPLOY` | Same token, or a separate one for wrangler deploy |
| `VITE_QA_WORKER_URL` | `https://mta-qa.YOUR-SUBDOMAIN.workers.dev` |

Add them at: GitHub repo → Settings → Secrets and variables → Actions → New repository secret

---

## Updating Content

When lesson files in `webapp/src/data/lessons/` change:
- **Automatic**: push to `master` triggers re-indexing via GitHub Actions
- **Manual**: re-run Step 6 locally

## Architecture

```
User question → Cloudflare Worker → BGE-M3 embed → Vectorize search → Llama 3.1 8B generate → answer
```

All runs on Cloudflare free tier: ~800-1400 Q&A queries/day.
