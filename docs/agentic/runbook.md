# Agentic Runbook

## Severity Levels

- `P0`: release-blocking defect, can impact production reliability or data integrity.
- `P1`: merge-blocking defect, impacts correctness or core feature behavior.
- `P2`: non-blocking risk, should be resolved before next release.
- `P3`: advisory improvement.

## Triage Flow

1. Read `output/agent-reports/release-gate.md`.
2. If `FAIL`, inspect blocking agent reports first: `pr-quality`, `api-contract`, `analytics-integrity`, `seo-content`.
3. Fix root cause and rerun `npm run agent:all`.
4. Confirm `release-gate` returns `PASS` before deploy.

## Ownership

- Platform/CI owner: workflow reliability and runtime setup.
- Product engineering owner: feature compliance and API/analytics behavior.
- Growth/content owner: SEO/content checks.

## Deploy Rule

No production deploy when a blocking agent fails in `block` mode.

## Data Quality Runtime Mode

- Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in CI secrets to enable live data-quality heuristics against D1.
- For local runs, set `D1_REMOTE_ACCESS=1` when your Wrangler session is already authenticated.
- Without D1 runtime access, the data-quality agent runs static schema/API checks only.
