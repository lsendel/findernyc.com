import { spawnSync } from 'node:child_process';

const commands = [
  'node scripts/agents/pr-quality.mjs',
  'node scripts/agents/feature-compliance.mjs',
  'node scripts/agents/api-contract.mjs',
  'node scripts/agents/analytics-integrity.mjs',
  'node scripts/agents/search-calibration.mjs',
  'node scripts/agents/neighborhood-fit-calibration.mjs',
  'node scripts/agents/recommendation-uplift-eval.mjs',
  'node scripts/agents/weekly-kpi-query-clusters.mjs',
  'node scripts/agents/seo-content.mjs',
  'node scripts/agents/data-quality.mjs',
  'node scripts/agents/release-gate.mjs',
  'node scripts/rollout/feature-rollout-plan.mjs',
  'node scripts/rollout/rollback-guard.mjs',
  'node scripts/rollout/phase-execution.mjs',
  'node scripts/agents/metrics-summary.mjs',
  'node scripts/agents/release-telemetry-dashboard.mjs',
  'node scripts/rollout/phase-promotion.mjs',
  'node scripts/rollout/phase-audit.mjs',
  'node scripts/rollout/phase-dwell.mjs',
  'node scripts/rollout/phase-governor.mjs',
  'node scripts/rollout/deployment-manifest.mjs',
  'node scripts/rollout/rollback-rehearsal.mjs',
  'node scripts/rollout/handoff-bundle.mjs',
  'node scripts/rollout/cross-phase-consistency.mjs',
  'node scripts/rollout/rollback-drill-matrix.mjs',
  'node scripts/rollout/program-closeout.mjs',
  'node scripts/agents/release-notes-summary.mjs',
];

for (const command of commands) {
  console.log(`\n$ ${command}`);
  const result = spawnSync(command, { shell: true, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
