# D1 Migration Checklist

## Goal

Move FinderNYC from the old Postgres-shaped data layer to Cloudflare D1 and leave the repo D1-only.

## Phase 1: Runtime Contract and Schema Shape

- [x] Switch the app database client from Neon HTTP to Drizzle D1.
- [x] Convert the Drizzle schema from `pg-core` to `sqlite-core`.
- [x] Change Worker env typing from `DATABASE_URL` to a D1 binding-shaped `DB`.
- [x] Update the Drizzle config to the D1/SQLite workflow.
- [x] Add a placeholder note in `wrangler.toml` for the real `[[d1_databases]]` binding.

## Phase 2: App Behavior Validation

- [ ] Run `npm run typecheck` and `npm test` against the D1-shaped code.
- [x] Confirm the current insert paths still work with SQLite/D1 semantics.
- [x] Normalize insert-id retrieval for D1 single-row inserts.
- [x] Normalize duplicate-key handling for SQLite constraint errors.

## Phase 3: Real D1 Provisioning

- [x] Create the production D1 database in Cloudflare.
- [x] Add a real `[[d1_databases]]` block to `wrangler.toml`.
- [x] Decide whether to keep a separate preview D1 database.
- [x] Verify local and remote `wrangler` workflows for D1.

## Phase 4: Historical Backfill (Only If a Source Export Exists)

- [x] Build a generic import path from structured JSON into D1 SQL.
- [x] Add post-import verification for row counts, JSON fields, and timestamps.
- [ ] Import archived data into D1 if a source export ever appears.

Current script path:
- `npm run db:build-import:d1`
- `npm run db:import:d1`
- `npm run db:verify:d1`
- Optional preview import: `D1_PREVIEW=1 npm run db:import:d1`
- Optional preview verify: `D1_PREVIEW=1 npm run db:verify:d1`

Current status:
- No provisioned Postgres source was found in repo config, Worker secrets, or local Cloudflare state.
- Both remote D1 databases are currently empty and verified.

## Phase 5: CI and Analytics Script Migration

- [x] Replace direct Neon usage in `scripts/agents/*.mjs`.
- [x] Rewrite Postgres-only SQL patterns such as `::int`, `NOW() - INTERVAL`, `!~`, and JSON operators.
- [x] Replace `DATABASE_URL`-based GitHub Actions runtime access with a D1-compatible approach.

## Phase 6: Docs and Cutover

- [x] Update `docs/deploy.md` to describe D1 instead of Neon.
- [x] Update agentic docs that still mention `DATABASE_URL`.
- [ ] Rehearse deploy and post-deploy validation on D1.
- [x] Remove leftover Postgres-specific code and assumptions from the repo.
