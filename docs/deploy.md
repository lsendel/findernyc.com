# Deployment Guide — findernyc.com

## Overview

FinderNYC runs as a **Cloudflare Worker** with static assets, backed by a **Neon PostgreSQL** database. The site is live at:

- **Production**: https://findernyc.com (and www.findernyc.com)
- **Workers URL**: https://local-event-discovery.luis-diaz-s.workers.dev

## Architecture

```
GitHub (lsendel/findernyc.com)
  └─ push to main
       └─ GitHub Actions (release.yml)
            ├─ release-gate (agent quality checks)
            ├─ ui-regression (visual + a11y, advisory)
            └─ deploy (wrangler deploy → Cloudflare Workers)
                  └─ findernyc.com (custom domain)
                        └─ DATABASE_URL → Neon PostgreSQL
```

## Cloudflare

### Account

- **Email**: luis.diaz.s@gmail.com
- **Account ID**: `f535e4aca2ddb62514897e75f0b5347f`
- **Worker name**: `local-event-discovery`
- **Zone**: `findernyc.com` (Zone ID: `fc7df4e90f495d2d8962332fc92f9242`)

### Auth

Wrangler authenticates via OAuth token stored at:

```
~/Library/Preferences/.wrangler/config/default.toml
```

If the token expires, re-authenticate:

```sh
npx wrangler login
```

### Manual Deploy

From the project root:

```sh
npx wrangler deploy
```

This builds and uploads the Worker + static assets to Cloudflare. No separate build step is needed — wrangler bundles the TypeScript directly.

### Custom Domain Config

Defined in `wrangler.toml`:

```toml
routes = [
  { pattern = "findernyc.com", custom_domain = true },
  { pattern = "www.findernyc.com", custom_domain = true },
]
```

### Worker Secrets

Secrets are set via wrangler CLI (not in wrangler.toml):

```sh
# Set the database connection string
npx wrangler secret put DATABASE_URL
# Paste the Neon connection string when prompted
```

To list current secrets:

```sh
npx wrangler secret list
```

**Currently configured secrets**: None yet. `DATABASE_URL` needs to be set (see Database section below).

## Database

### Provider: Neon PostgreSQL

- **Neon Organization**: Luis (`org-shiny-pond-29352049`)
- **Neon Console**: https://console.neon.tech

There is **no existing Neon project** for findernyc yet. A project needs to be created.

### Creating the Database

1. Create a new Neon project (recommended region: `aws-us-east-1` for low latency to Cloudflare edge):

```sh
# Via Neon MCP or console
# Project name: findernyc-production
# Region: aws-us-east-1
# PostgreSQL version: 17
```

2. Get the connection string from the Neon dashboard. It looks like:

```
postgresql://<user>:<password>@<endpoint>.neon.tech/neondb?sslmode=require
```

3. Set it as a Cloudflare Worker secret:

```sh
npx wrangler secret put DATABASE_URL
# Paste the connection string
```

4. Run database migrations:

```sh
DATABASE_URL="<connection-string>" npm run db:generate
DATABASE_URL="<connection-string>" npm run db:migrate
```

### Schema

Defined in `src/db/schema.ts`. Tables:

| Table | Purpose |
|-------|---------|
| `leads` | Lead capture form submissions |
| `waitlist_entries` | Waitlist signups with follow-up routing |
| `analytics_events` | Client-side analytics event log |
| `saved_searches` | User saved search queries and alert preferences |
| `alert_delivery_attempts` | Delivery tracking for saved search alerts |

### ORM & Migrations

- **ORM**: Drizzle ORM with `@neondatabase/serverless` driver
- **Config**: `drizzle.config.ts`
- **Migrations dir**: `src/db/migrations/`
- **Generate migrations**: `npm run db:generate`
- **Apply migrations**: `npm run db:migrate`

### Database Client

`src/db/client.ts` — creates a Drizzle instance from a Neon serverless connection. All route handlers access it via `c.env.DATABASE_URL`. The app gracefully degrades if `DATABASE_URL` is not set (returns mock/fallback responses).

## CI/CD Pipeline

### GitHub Actions Workflows

All triggered on push to `main`:

| Workflow | File | Purpose |
|----------|------|---------|
| **Release** | `.github/workflows/release.yml` | Full pipeline: agents → ui-regression → deploy |
| **CI Agentic Quality Gate** | `.github/workflows/ci.yml` | Runs quality agents on every push |
| **UI Regression** | `.github/workflows/ui-regression.yml` | Visual screenshot + a11y testing |

### Release Pipeline

```
release-gate (blocking)
  ├─ pr-quality (build, typecheck, tests + coverage)
  ├─ api-contract (contract ↔ route ↔ test alignment)
  ├─ analytics-integrity (event enum parity)
  ├─ seo-content (meta tags, structured data)
  ├─ feature-compliance (requirements ↔ test mapping)
  ├─ search-calibration, neighborhood-fit, recommendation-uplift
  ├─ data-quality
  ├─ release-gate (aggregates all results → READY/HOLD)
  └─ rollout scripts (plan, guard, promotion, dwell, etc.)

ui-regression (advisory, non-blocking)
  ├─ Playwright screenshots of critical routes
  ├─ Visual baseline comparison
  └─ axe a11y audit

deploy (runs if release-gate = READY)
  └─ npx wrangler deploy
```

### GitHub Secrets Required for CI Deploy

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers write access |
| `CLOUDFLARE_ACCOUNT_ID` | `f535e4aca2ddb62514897e75f0b5347f` |

These are set in GitHub repo settings → Secrets and variables → Actions.

**Note**: CI deploy is optional. You can always deploy manually with `npx wrangler deploy` using local OAuth credentials.

## Quick Reference

### Deploy to production (manual)

```sh
npx wrangler deploy
```

### Run tests before deploying

```sh
npm run typecheck && npm test
```

### Run all quality agents

```sh
npm run agent:all
```

### Check release readiness

```sh
cat output/agent-reports/release-decision.json
```

### View live logs

```sh
npx wrangler tail
```

### Local development

```sh
npm run dev
# Runs at http://localhost:8787
```

### Build client-side JS

```sh
npm run build:client
```

## Troubleshooting

### "Could not resolve host: findernyc.com"

DNS propagation or local cache. Verify with:

```sh
dig findernyc.com +short
```

Should return Cloudflare IPs (e.g., `104.21.96.74`, `172.67.174.70`).

### CI release-gate fails

Check which agent failed:

```sh
gh run view <run-id> --repo lsendel/findernyc.com
gh run download <run-id> --name release-agent-reports --dir /tmp/reports
```

### Worker returns errors about DATABASE_URL

The database secret isn't set. Run:

```sh
npx wrangler secret put DATABASE_URL
```

The app works without a database (returns fallback responses) but lead capture, waitlist, analytics, and saved searches require it.
