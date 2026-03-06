# Calibration Playbook

## Cadence

- Run weekly calibration using recent agent reports and `metrics-log.csv`.

## Inputs

- `output/agent-reports/agent-metrics.json`
- `output/agent-reports/release-gate-changelog.md`
- `docs/agentic/metrics-log.csv`

## Decision Rules

1. If false positives > 5 in 90 days for one agent, relax or refine noisy checks.
2. If false negatives > 0, add missing assertions/tests and tighten checks.
3. If MTTR average > 180 minutes, simplify triage path and improve failure diagnostics.
4. Promote advisory checks to blocking only after two clean weeks.

## Output

- Update threshold rules in relevant agent scripts.
- Append calibration notes to `metrics-log.csv`.
- Document policy changes in PR notes and release changelog excerpt.
