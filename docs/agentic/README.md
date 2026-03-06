# Agentic Pipeline

This directory defines the operating model for automated quality and release agents.

## Agents

- `pr-quality`: Build + typecheck + tests + coverage gate.
- `feature-compliance`: Maps source-file changes to R1-R14 and checks test anchors.
- `api-contract`: Checks route/contract/event enum consistency.
- `analytics-integrity`: Checks client analytics taxonomy, DNT handling, and CTA attribution tags.
- `search-calibration`: Produces weekly search relevance calibration recommendations from query/click outcomes.
- `neighborhood-fit-calibration`: Produces weekly neighborhood-fit weight recommendations from post-click outcomes.
- `recommendation-uplift-eval`: Produces offline uplift reports for personalized + best-value ranking versus baseline.
- `seo-content`: Validates route indexability and runs SEO route tests.
- `data-quality`: Validates schema/API quality controls.
- `ui-regression`: Captures Playwright screenshots for critical routes, compares to baselines, and includes a11y summary.
- `release-gate`: Aggregates agent outputs and determines deploy readiness.
- `release-telemetry-dashboard`: Builds weekly KPI snapshots for release readiness and calibration outcomes.
- `release-notes-summary`: Generates automated release notes from CI agent artifacts.

## Report Output

Each agent writes:

- `output/agent-reports/<agent-id>.md`
- `output/agent-reports/<agent-id>.json`

## Modes

- `block` (default): failing checks return non-zero exit code.
- `warn`: failures are reported but do not block (`AGENT_MODE=warn`).

## Commands

- `npm run agent:all`
- `npm run agent:release-gate`
- `npm run agent:ui-regression`
- `npm run agent:ui-regression:baseline` (refreshes baseline images)
- `npm run agent:search-calibration`
- `npm run agent:neighborhood-fit-calibration`
- `npm run agent:recommendation-uplift-eval`
- `npm run agent:metrics-summary`
- `npm run agent:release-telemetry-dashboard`
- `npm run agent:release-notes-summary`

## Planning

- Week-by-week implementation plan: `/Users/lsendel/Projects/findernyc.com/docs/agentic/week-by-week-plan.md`
- Requirement mapping source: `/Users/lsendel/Projects/findernyc.com/docs/agentic/requirements-map.json`
