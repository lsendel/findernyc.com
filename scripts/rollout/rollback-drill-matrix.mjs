import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPORT_DIR, ensureDir, writeAgentReport, exitForStatus, getMode } from '../agents/lib.mjs';

const PHASE_ORDER = ['canary', 'partial', 'full'];

function readJsonOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function previousPhase(phase) {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx < 0) return null;
  return idx === 0 ? 'canary' : PHASE_ORDER[idx - 1];
}

const mode = getMode();
const rolloutPlan = readJsonOrNull('output/agent-reports/feature-flag-rollout-plan.json');
const phases = rolloutPlan?.extra?.phases ?? [];

const matrix = phases.map((phase) => {
  const rollbackTarget = previousPhase(phase.phase);
  return {
    source_phase: phase.phase,
    rollback_phase: rollbackTarget,
    source_env_file: `output/agent-reports/rollout-phase-${phase.phase}.env`,
    rollback_env_file: rollbackTarget ? `output/agent-reports/rollout-phase-${rollbackTarget}.env` : null,
    command: rollbackTarget
      ? `set -a && source output/agent-reports/rollout-phase-${rollbackTarget}.env && set +a && npx wrangler deploy`
      : 'unavailable',
  };
});

const drillScriptPath = join(REPORT_DIR, 'rollout-rollback-drill.sh');
const drillScript = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '',
  'phase="${1:-partial}"',
  'case "$phase" in',
  '  full) target="partial" ;;',
  '  partial) target="canary" ;;',
  '  canary) target="canary" ;;',
  '  *) echo "Unsupported phase: $phase"; exit 1 ;;',
  'esac',
  '',
  'set -a && source "output/agent-reports/rollout-phase-${target}.env" && set +a',
  'echo "Rollback drill: ${phase} -> ${target}"',
  'npx wrangler deploy',
  '',
].join('\n');

ensureDir(REPORT_DIR);
writeFileSync(drillScriptPath, drillScript, { encoding: 'utf8', mode: 0o755 });

const checks = [
  {
    name: 'Rollout Plan Artifact Present',
    success: Boolean(rolloutPlan),
    notes: rolloutPlan ? 'feature-flag-rollout-plan.json loaded' : 'missing rollout plan artifact',
  },
  {
    name: 'Rollback Drill Matrix Built',
    success: matrix.length > 0,
    notes: `entries=${matrix.length}`,
  },
  {
    name: 'Rollback Targets Resolved For Entries',
    success: matrix.every((entry) => Boolean(entry.rollback_phase)),
    notes: matrix.map((entry) => `${entry.source_phase}->${entry.rollback_phase}`).join(', '),
  },
  {
    name: 'Rollback Drill Script Generated',
    success: true,
    notes: drillScriptPath,
  },
];

const payload = {
  generatedAt: new Date().toISOString(),
  matrix,
  drill_script: drillScriptPath,
};

writeFileSync(join(REPORT_DIR, 'rollout-rollback-drill-matrix.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const details = [
  `matrix entries: ${matrix.length}`,
  `mappings: ${matrix.map((entry) => `${entry.source_phase}->${entry.rollback_phase}`).join(', ')}`,
  `drill script: ${drillScriptPath}`,
];

const report = writeAgentReport({
  id: 'rollout-rollback-drill-matrix',
  title: 'Rollout Rollback Drill Matrix Agent Report',
  summary: 'Builds per-phase rollback drill mappings and a reusable rollback drill script for operations.',
  checks,
  details,
  mode,
  extra: payload,
});

const markdown = [
  '# Rollout Rollback Drill Matrix',
  '',
  `- Generated At: ${payload.generatedAt}`,
  `- Entries: ${matrix.length}`,
  `- Drill Script: ${drillScriptPath}`,
  '',
  '## Matrix',
  '',
  ...matrix.map((entry) => `- ${entry.source_phase} -> ${entry.rollback_phase}: \`${entry.command}\``),
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-rollback-drill-matrix.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log('Report written: output/agent-reports/rollout-rollback-drill-matrix.md');
exitForStatus(report);
