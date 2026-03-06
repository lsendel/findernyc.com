# Week-by-Week Agentic Implementation Plan (YOLO Mode)

## Week 1 (completed)

- Added granular requirement map tied to R1-R14.
- Upgraded feature-compliance agent to map source changes to numbered requirements.
- Improved changed-file detection for untracked directories and monorepo-like states.
- Completed validation: `npm run agent:all` passes in block mode.

## Week 2 (completed)

- Strengthened `api-contract` agent with endpoint-level status-code parity checks.
- Added drift checks between `src/contract.ts` body keys and route validators.
- Added route composition checks for `mount prefix + sub-route path` against contract paths.
- Added API test assertions coverage checks for contract response statuses.
- Completed validation: `npm run agent:all` passes in block mode.

## Week 3 (completed)

- Expanded `analytics-integrity` to validate required properties by event type.
- Added checks for missing/orphan `data-cta` attribution labels.
- Added unknown-event detection from analytics-related test fixtures.
- Completed validation: `npm run agent:all` passes in block mode.

## Week 4 (completed)

- Expanded `seo-content` agent with per-page metadata checks across content pages.
- Added freshness/date sanity checks for blog posts and sitemap strategy checks.
- Added canonical/robots/noindex template validation across landing/contact/content templates.
- Completed validation: `npm run agent:all` passes in block mode.

## Week 5 (completed)

- Added `ui-regression` agent for critical route screenshots and baseline comparison.
- Added baseline management mode (`UPDATE_BASELINE=1`) and generated initial baseline images.
- Added UI regression workflow and release-time UI gating.
- Integrated a11y-focused test summary into UI regression report.
- Completed validation: `npm run agent:ui-regression` and `npm run agent:all` pass.

## Week 6 (completed)

- Expanded `data-quality` with optional runtime DB checks when `DATABASE_URL` is set.
- Added duplicate ratio, invalid ZIP, and ingestion recency heuristics.
- Enabled nightly runtime metrics collection via `DATABASE_URL` secret.
- Completed validation: `npm run agent:all` passes in block mode.

## Week 7 (completed)

- Hardened `release-gate` with policy profiles (`strict`, `standard`, `warn`).
- Added machine-readable decision output: `output/agent-reports/release-decision.json`.
- Added release changelog excerpt: `output/agent-reports/release-gate-changelog.md`.
- Wired release workflow to consume decision output before deploy.
- Completed validation: `npm run agent:all` passes in block mode.

## Week 8 (completed)

- Operationalized runbook assets:
  - owner/SLA matrix
  - incident template
  - calibration playbook
- Added metrics summary agent for signal quality and MTTR tracking.
- Added weekly calibration workflow and metrics log source file.
- Completed validation: `npm run agent:all` passes in block mode.

## Forward Agentic Plan (Weeks 9-14)

Assumption: Week 9 starts Monday, March 2, 2026.

## Week 9 (planned)

- Add `rollout-readiness` agent to enforce feature-flag guardrails, kill-switch presence, and rollout checklist parity.
- Add stale-flag detection report with recommended cleanup windows.
- Validate with `npm run agent:all` and include new report in release gate advisory set.

## Week 10 (planned)

- Add `notification-reliability` agent for synthetic email/SMS/push dispatch checks.
- Add provider-latency and retry-budget checks against alert delivery attempts.
- Wire weekly artifact export for incident review handoff.

## Week 11 (planned)

- Add `reco-quality` agent to score personalized ranking quality and best-value uplift.
- Add drift checks for ranking weights and neighborhood-fit calibration deltas.
- Add guardrail check for minimum click-volume before retraining recommendations are applied.

## Week 12 (planned)

- Add `trust-safety` agent covering fraud score drift and review-authenticity precision/recall thresholds.
- Add false-positive budget checks and escalation rules for trust model tuning.
- Require trust-safety report for release gate blocking in `strict` and `standard` policy profiles.

## Week 13 (planned)

- Add `ai-safety-regression` agent for prompt-injection defenses, PII leakage checks, and refusal-policy conformance.
- Add response-grounding checks for concierge/assistant features using deterministic fixtures.
- Add weekly red-team sample set and longitudinal score trend report.

## Week 14 (planned)

- Add `partner-isolation` agent for webhook auth, workspace role boundary checks, and white-label tenant isolation.
- Add `dashboard-metrics` agent checks for insights-hub data freshness and null-rate thresholds.
- Finalize policy update so partner and AI safety agents are mandatory blocking checks for production release.

## Execution Rules

- Work proceeds week-by-week without waiting for approval unless blocked by missing external credentials/services.
- Default mode is `block` on PR/Release and `warn` on nightly audits.
- Every week ends with `npm run agent:all` and updated reports in `output/agent-reports/`.
- Planned weeks are executed in lockstep with the 30-feature rollout plan in `/Users/lsendel/Projects/findernyc.com/docs/execution/30-feature-rollout.md`.
