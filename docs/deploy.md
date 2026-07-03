# Deployment Guide — findernyc.com

## Overview

FinderNYC runs as a **Cloudflare Worker** with static assets, backed by a **Cloudflare D1** database for the Worker runtime. The site is live at:

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
                        └─ D1 binding (`DB`) → findernyc-production
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

## Database

### Provider: Cloudflare D1

- **Production DB**: `findernyc-production`
- **Production ID**: `3b28bfa8-4eb9-4c1e-a342-a5557fb79344`
- **Preview DB**: `findernyc-preview`
- **Preview ID**: `0400aca1-b8b3-46d8-9d19-3f8d1efaf16d`
- **Region**: `ENAM`

### Current Binding

Defined in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "findernyc-production"
database_id = "3b28bfa8-4eb9-4c1e-a342-a5557fb79344"
preview_database_id = "0400aca1-b8b3-46d8-9d19-3f8d1efaf16d"
migrations_dir = "src/db/migrations"
```

### Migrations

Generate a new migration from the Drizzle schema:

```sh
npm run db:generate
```

Apply migrations to the production D1 database:

```sh
npx wrangler d1 migrations apply DB --remote
```

Apply migrations to the preview D1 database:

```sh
npx wrangler d1 migrations apply DB --remote --preview
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

- **ORM**: Drizzle ORM with the D1 driver
- **Config**: `drizzle.config.ts`
- **Migrations dir**: `src/db/migrations/`
- **Generate migrations**: `npm run db:generate`
- **Apply migrations**: `npx wrangler d1 migrations apply DB --remote`

### Database Client

`src/db/client.ts` — creates a Drizzle instance from the Worker D1 binding. All route handlers access it via `c.env.DB`. The app gracefully degrades if the binding is not present (returns mock/fallback responses).

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

### Remaining Cutover Work

The Worker runtime, migrations, and CI-side agent queries are on D1. No provisioned Postgres source was found in the repo config, Worker secrets, or local Cloudflare state, so the repo now treats D1 as the only supported database path. If an archival export ever appears later, the generic D1 import scripts can still backfill it. The tracked checklist lives in `docs/execution/d1-migration-checklist.md`.

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

### Import archived data into D1

```sh
npm run db:build-import:d1
npm run db:import:d1
npm run db:verify:d1
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

Generate Worker binding types after config changes:

```sh
npx wrangler types worker-configuration.d.ts
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

### Worker cannot see the D1 binding

Validate the binding and preview database IDs:

```sh
npx wrangler deploy --dry-run
```

The output should list:

```txt
DB: findernyc-production (...), Preview: (0400aca1-b8b3-46d8-9d19-3f8d1efaf16d)
```
