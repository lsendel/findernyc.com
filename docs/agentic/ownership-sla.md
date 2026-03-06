# Ownership and SLA

## Agent Ownership

- `pr-quality`: Platform engineering owner
- `feature-compliance`: Product engineering owner
- `api-contract`: API/platform owner
- `analytics-integrity`: Growth/data owner
- `seo-content`: Growth/content owner
- `data-quality`: Data engineering owner
- `ui-regression`: Frontend owner
- `release-gate`: Release manager / platform owner

## SLA Targets

- P0 blocking failure: acknowledge within 15 minutes, mitigation in 60 minutes.
- P1 merge-blocking failure: acknowledge within 1 hour, mitigation in same business day.
- P2 advisory risk: acknowledge within 1 business day, resolution within 3 business days.
- P3 improvement: triage in weekly planning.

## Escalation Matrix

1. Agent owner triages and proposes fix.
2. If unresolved after SLA window, escalate to platform lead.
3. If release-blocking impact persists, escalate to engineering manager and pause deploy.
