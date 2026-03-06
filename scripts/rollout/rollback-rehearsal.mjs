import { join } from 'node:path';
import { writeFileSync, readFileSync } from 'node:fs';
import { REPORT_DIR, ensureDir, writeAgentReport, exitForStatus, getMode } from '../agents/lib.mjs';

const PHASE_ORDER = ['canary', 'partial', 'full'];

function readJsonOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function normalizePhase(value) {
  const phase = (value ?? '').toString().trim().toLowerCase();
  return PHASE_ORDER.includes(phase) ? phase : null;
}

function previousPhase(phase) {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx < 0) return null;
  return idx === 0 ? 'canary' : PHASE_ORDER[idx - 1];
}

const mode = getMode();
const enforceRehearsal = process.env.ROLLOUT_REHEARSAL_ENFORCE === '1';

const rolloutPlan = readJsonOrNull('output/agent-reports/feature-flag-rollout-plan.json');
const governorDecision = readJsonOrNull('output/agent-reports/rollout-governor-decision.json');
const dwellDecision = readJsonOrNull('output/agent-reports/rollout-dwell-decision.json');
const promotionDecision = readJsonOrNull('output/agent-reports/rollout-promotion-decision.json');

const targetPhase =
  normalizePhase(governorDecision?.target_phase) ??
  normalizePhase(dwellDecision?.effective_recommended_phase) ??
  normalizePhase(promotionDecision?.recommended_phase);
const rollbackPhase = targetPhase ? previousPhase(targetPhase) : null;

const phases = rolloutPlan?.extra?.phases ?? [];
const rollbackPhasePlan = phases.find((phase) => phase.phase === rollbackPhase) ?? null;
const rollbackFlags = rollbackPhasePlan?.enabled_flags ?? [];
const rollbackReady = Boolean(targetPhase) && Boolean(rollbackPhase) && rollbackFlags.length > 0;

ensureDir(REPORT_DIR);
const rollbackEnvPath = join(REPORT_DIR, 'rollout-phase-rollback.env');
const rollbackEnv = [
  `FEATURE_FLAGS=${rollbackFlags.join(',')}`,
  `ROLLOUT_TARGET_PHASE=${rollbackPhase ?? ''}`,
  `ROLLOUT_SOURCE_PHASE=${targetPhase ?? ''}`,
  `ROLLOUT_REHEARSAL_GENERATED_AT=${new Date().toISOString()}`,
  '',
].join('\n');
writeFileSync(rollbackEnvPath, rollbackEnv, 'utf8');

const rollbackScriptPath = join(REPORT_DIR, 'rollout-rollback-rehearsal.sh');
const rollbackScript = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '',
  `export ROLLOUT_REHEARSAL_TARGET="${rollbackPhase ?? ''}"`,
  `export ROLLOUT_REHEARSAL_SOURCE="${targetPhase ?? ''}"`,
  '',
  'if [[ -z "$ROLLOUT_REHEARSAL_TARGET" ]]; then',
  '  echo "Rollback rehearsal blocked: unresolved target phase."',
  '  exit 1',
  'fi',
  '',
  `set -a && source "${rollbackEnvPath}" && set +a`,
  'echo "Rehearsing rollback: $ROLLOUT_SOURCE_PHASE -> $ROLLOUT_TARGET_PHASE"',
  'npx wrangler deploy',
  '',
].join('\n');
writeFileSync(rollbackScriptPath, rollbackScript, { encoding: 'utf8', mode: 0o755 });

const checks = [
  {
    name: 'Rollout Plan Artifact Present',
    success: Boolean(rolloutPlan),
    notes: rolloutPlan ? 'feature-flag-rollout-plan.json loaded' : 'missing rollout plan artifact',
  },
  {
    name: 'Target Phase Resolved',
    success: Boolean(targetPhase),
    notes: `targetPhase=${targetPhase ?? 'unknown'}`,
  },
  {
    name: 'Rollback Phase Resolved',
    success: Boolean(rollbackPhase),
    notes: `rollbackPhase=${rollbackPhase ?? 'unknown'}`,
  },
  {
    name: 'Rollback Phase Exists In Rollout Plan',
    success: Boolean(rollbackPhasePlan),
    notes: `rollbackPhase=${rollbackPhase ?? 'unknown'}`,
  },
  {
    name: 'Rollback Env Contains Feature Flags',
    success: rollbackFlags.length > 0,
    notes: `rollbackFlags=${rollbackFlags.length}`,
  },
  {
    name: 'Rollback Rehearsal Script Generated',
    success: true,
    notes: rollbackScriptPath,
  },
  {
    name: 'Rollback Rehearsal Ready',
    success: !enforceRehearsal || rollbackReady,
    notes: `ready=${rollbackReady} enforce=${enforceRehearsal}`,
  },
];

const details = [
  `Source Phase: ${targetPhase ?? 'unknown'}`,
  `Rollback Phase: ${rollbackPhase ?? 'unknown'}`,
  `Rollback Flags (${rollbackFlags.length}): ${rollbackFlags.join(', ') || 'none'}`,
  `Rollback Env Path: ${rollbackEnvPath}`,
  `Rollback Script Path: ${rollbackScriptPath}`,
  `Rollback Ready: ${rollbackReady}`,
];

const report = writeAgentReport({
  id: 'rollout-rollback-rehearsal',
  title: 'Rollout Rollback Rehearsal Agent Report',
  summary: 'Builds rollback rehearsal artifacts by deriving the previous safe phase and generating deployable rollback payloads.',
  checks,
  details,
  mode,
  extra: {
    source_phase: targetPhase,
    rollback_phase: rollbackPhase,
    rollback_flags: rollbackFlags,
    rollback_env_path: rollbackEnvPath,
    rollback_script_path: rollbackScriptPath,
    rollback_ready: rollbackReady,
    enforce_rehearsal: enforceRehearsal,
  },
});

const markdown = [
  '# Rollback Rehearsal',
  '',
  `- Generated At: ${new Date().toISOString()}`,
  `- Source Phase: ${targetPhase ?? 'unknown'}`,
  `- Rollback Phase: ${rollbackPhase ?? 'unknown'}`,
  `- Rollback Ready: ${rollbackReady ? 'yes' : 'no'}`,
  `- Rollback Env: ${rollbackEnvPath}`,
  `- Rollback Script: ${rollbackScriptPath}`,
  '',
  '## Next Command',
  '',
  `- Execute rollback rehearsal: \`${rollbackScriptPath}\``,
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-rollback-rehearsal.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log('Report written: output/agent-reports/rollout-rollback-rehearsal.md');
exitForStatus(report);
