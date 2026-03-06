import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { REPORT_DIR, ensureDir, writeAgentReport, exitForStatus, getMode } from '../agents/lib.mjs';
import { buildRolloutPhases, loadFeatureFlagKeys } from './lib.mjs';

const mode = getMode();
const keys = loadFeatureFlagKeys();
const rollout = buildRolloutPhases(keys, {
  stableEnabled: ['experimentation_framework'],
});

const checks = [
  {
    name: 'Feature Flag Keys Loaded',
    success: rollout.total_flags > 0,
    notes: `${rollout.total_flags} feature flags discovered`,
  },
  {
    name: 'Three Rollout Phases Generated',
    success: rollout.phases.length === 3,
    notes: `phases=${rollout.phases.map((phase) => phase.phase).join(',')}`,
  },
  {
    name: 'Canary Phase Has Newly Enabled Flags',
    success: rollout.phases[0]?.newly_enabled.length > 0,
    notes: `${rollout.phases[0]?.newly_enabled.length ?? 0} newly enabled`,
  },
  {
    name: 'Full Phase Covers All Candidate Flags',
    success: rollout.phases[2]?.enabled_flags.length === rollout.total_flags,
    notes: `full=${rollout.phases[2]?.enabled_flags.length ?? 0} total=${rollout.total_flags}`,
  },
];

const details = rollout.phases.flatMap((phase) => [
  `${phase.phase.toUpperCase()}: ${phase.description}`,
  `newly-enabled: ${phase.newly_enabled.join(', ') || 'none'}`,
  `feature-flags-env: ${phase.enabled_flags.join(',')}`,
  `gate-checks: ${phase.gate_checks.join(', ')}`,
]);

const report = writeAgentReport({
  id: 'feature-flag-rollout-plan',
  title: 'Feature Flag Rollout Plan Agent Report',
  summary: 'Builds staged canary/partial/full feature-flag rollout sets with gate checks for each phase.',
  checks,
  details,
  mode,
  extra: rollout,
});

ensureDir(REPORT_DIR);
const markdown = [
  '# Feature Flag Rollout Plan',
  '',
  `- Generated At: ${new Date().toISOString()}`,
  `- Candidate Flags: ${rollout.candidate_count}`,
  `- Stable Enabled: ${rollout.stable_enabled.join(', ')}`,
  '',
  '## Phases',
  ...rollout.phases.flatMap((phase, index) => [
    '',
    `### ${index + 1}. ${phase.phase.toUpperCase()}`,
    '',
    `- Description: ${phase.description}`,
    `- Newly Enabled (${phase.newly_enabled.length}): ${phase.newly_enabled.join(', ') || 'none'}`,
    `- Enabled Set (${phase.enabled_flags.length}): ${phase.enabled_flags.join(', ')}`,
    `- Gate Checks: ${phase.gate_checks.join(', ')}`,
  ]),
  '',
  '## Rollback Guard Rule',
  '',
  '- Progress to the next phase only if rollback guard decision is `PROCEED` and release gate is `READY`.',
  '',
];
writeFileSync(join(REPORT_DIR, 'feature-flag-rollout-plan.md'), markdown.join('\n'), 'utf8');

console.log('Report written: output/agent-reports/feature-flag-rollout-plan.md');
exitForStatus(report);
