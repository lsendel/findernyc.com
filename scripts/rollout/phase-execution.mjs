import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { REPORT_DIR, ensureDir, writeAgentReport, exitForStatus, getMode } from '../agents/lib.mjs';

function readJsonOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function normalizePhase(value) {
  const phase = (value ?? '').toString().trim().toLowerCase();
  return ['canary', 'partial', 'full'].includes(phase) ? phase : null;
}

const mode = getMode();
const targetPhase = normalizePhase(process.env.ROLLOUT_TARGET_PHASE) ?? 'canary';
const rolloutPlan = readJsonOrNull('output/agent-reports/feature-flag-rollout-plan.json');
const rollbackDecisionFile = readJsonOrNull('output/agent-reports/rollback-guard-decision.json');
const rollbackGuardReport = readJsonOrNull('output/agent-reports/rollback-guard.json');
const guardDecision =
  rollbackDecisionFile?.decision ?? rollbackGuardReport?.extra?.decision ?? 'ROLLBACK_HOLD';
const normalizedGuardDecision = guardDecision.toString().trim().toUpperCase();

const phases = rolloutPlan?.extra?.phases ?? [];
const selectedPhase = phases.find((phase) => phase.phase === targetPhase) ?? null;
const requiresGuardProceed = targetPhase !== 'canary';
const allowedByGuard = !requiresGuardProceed || normalizedGuardDecision === 'PROCEED';

const checks = [
  {
    name: 'Rollout Plan Artifact Present',
    success: Boolean(rolloutPlan),
    notes: rolloutPlan ? 'feature-flag-rollout-plan.json loaded' : 'missing rollout plan artifact',
  },
  {
    name: 'Selected Rollout Phase Found',
    success: Boolean(selectedPhase),
    notes: selectedPhase ? `phase=${targetPhase}` : `phase=${targetPhase} missing from rollout plan`,
  },
  {
    name: 'Selected Phase Has Enabled Feature Flags',
    success: (selectedPhase?.enabled_flags?.length ?? 0) > 0,
    notes: `${selectedPhase?.enabled_flags?.length ?? 0} enabled flags`,
  },
  {
    name: 'Rollback Guard Allows Progression',
    success: allowedByGuard,
    notes: requiresGuardProceed
      ? `decision=${normalizedGuardDecision} required=PROCEED`
      : `decision=${normalizedGuardDecision} (canary phase allows initial execution)`,
  },
];

const enabledFlags = selectedPhase?.enabled_flags ?? [];
const envFile = join(REPORT_DIR, `rollout-phase-${targetPhase}.env`);
const envContent = [
  `FEATURE_FLAGS=${enabledFlags.join(',')}`,
  `ROLLOUT_PHASE=${targetPhase}`,
  `ROLLBACK_GUARD_DECISION=${normalizedGuardDecision}`,
  `ROLLOUT_GENERATED_AT=${new Date().toISOString()}`,
  '',
].join('\n');

ensureDir(REPORT_DIR);
writeFileSync(envFile, envContent, 'utf8');

const details = [
  `Target Phase: ${targetPhase}`,
  `Guard Decision: ${normalizedGuardDecision}`,
  `Enabled Flags (${enabledFlags.length}): ${enabledFlags.join(', ') || 'none'}`,
  `Newly Enabled (${selectedPhase?.newly_enabled?.length ?? 0}): ${selectedPhase?.newly_enabled?.join(', ') || 'none'}`,
  `Env Artifact: ${envFile}`,
];

const report = writeAgentReport({
  id: 'rollout-phase-execution',
  title: 'Rollout Phase Execution Agent Report',
  summary:
    'Builds phase-specific feature-flag env payloads and enforces rollback-guard policy before partial/full progression.',
  checks,
  details,
  mode,
  extra: {
    target_phase: targetPhase,
    guard_decision: normalizedGuardDecision,
    requires_guard_proceed: requiresGuardProceed,
    allowed_to_proceed: allowedByGuard,
    env_file: envFile,
    enabled_flags: enabledFlags,
  },
});

const markdown = [
  '# Rollout Phase Execution',
  '',
  `- Generated At: ${new Date().toISOString()}`,
  `- Target Phase: ${targetPhase}`,
  `- Guard Decision: ${normalizedGuardDecision}`,
  `- Allowed To Proceed: ${allowedByGuard ? 'yes' : 'no'}`,
  `- Env File: ${envFile}`,
  '',
  '## Deployment Payload',
  '',
  `- Feature Flags (${enabledFlags.length}): ${enabledFlags.join(', ') || 'none'}`,
  `- Newly Enabled (${selectedPhase?.newly_enabled?.length ?? 0}): ${selectedPhase?.newly_enabled?.join(', ') || 'none'}`,
  '',
  '## Execution Commands',
  '',
  `- Load payload: \`set -a && source ${envFile} && set +a\``,
  '- Verify payload: `echo "$ROLLOUT_PHASE" && echo "$FEATURE_FLAGS"`',
  '- Deploy: `npx wrangler deploy`',
  '- Roll back: set `FEATURE_FLAGS` to prior phase payload and redeploy.',
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-phase-execution.md'), markdown.join('\n'), 'utf8');

console.log('Report written: output/agent-reports/rollout-phase-execution.md');
exitForStatus(report);
