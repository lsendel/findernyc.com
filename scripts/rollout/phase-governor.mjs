import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

function normalizePhase(value) {
  const phase = (value ?? '').toString().trim().toLowerCase();
  return PHASE_ORDER.includes(phase) ? phase : null;
}

function normalizeBool(value) {
  return value === true;
}

const mode = getMode();
const enforceGovernor = process.env.ROLLOUT_GOVERNOR_ENFORCE === '1';

const releaseDecision = readJsonOrNull('output/agent-reports/release-decision.json');
const rollbackGuardDecision = readJsonOrNull('output/agent-reports/rollback-guard-decision.json');
const rolloutPlan = readJsonOrNull('output/agent-reports/feature-flag-rollout-plan.json');
const promotionDecision = readJsonOrNull('output/agent-reports/rollout-promotion-decision.json');
const auditReport = readJsonOrNull('output/agent-reports/rollout-phase-audit.json');
const dwellDecision = readJsonOrNull('output/agent-reports/rollout-dwell-decision.json');

const releaseReady = (releaseDecision?.decision ?? 'HOLD').toString().trim().toUpperCase() === 'READY';
const rollbackProceed =
  (rollbackGuardDecision?.decision ?? 'ROLLBACK_HOLD').toString().trim().toUpperCase() === 'PROCEED';
const transitionValid = normalizeBool(auditReport?.extra?.transition_valid);
const dwellBlocked = normalizeBool(dwellDecision?.blocked_by_dwell);

const targetPhase =
  normalizePhase(dwellDecision?.effective_recommended_phase) ??
  normalizePhase(promotionDecision?.recommended_phase);
const sourceDecision = (dwellDecision?.effective_decision ?? promotionDecision?.decision ?? 'UNKNOWN')
  .toString()
  .trim()
  .toUpperCase();

const planPhases = rolloutPlan?.extra?.phases ?? [];
const targetPhasePlan = planPhases.find((phase) => phase.phase === targetPhase) ?? null;
const targetPhaseExistsInPlan = Boolean(targetPhasePlan);

const primaryEnvPath = targetPhase ? join(REPORT_DIR, `rollout-phase-${targetPhase}.env`) : null;
const fallbackEnvPath = promotionDecision?.env_file ?? null;
const envPath =
  (primaryEnvPath && existsSync(primaryEnvPath) && primaryEnvPath) ||
  (fallbackEnvPath && existsSync(fallbackEnvPath) && fallbackEnvPath) ||
  primaryEnvPath ||
  fallbackEnvPath;
const envFilePresent = Boolean(envPath && existsSync(envPath));

const shouldDeploy =
  releaseReady &&
  rollbackProceed &&
  transitionValid &&
  !dwellBlocked &&
  Boolean(targetPhase) &&
  targetPhaseExistsInPlan &&
  envFilePresent;

let governorAction = 'HOLD_PHASE';
if (shouldDeploy) {
  governorAction = `DEPLOY_${(targetPhase ?? 'canary').toUpperCase()}`;
} else if (!releaseReady || !rollbackProceed) {
  governorAction = 'HOLD_OR_ROLLBACK';
}

const checks = [
  {
    name: 'Release Decision Ready',
    success: releaseReady,
    notes: `decision=${releaseDecision?.decision ?? 'missing'}`,
  },
  {
    name: 'Rollback Guard Proceed',
    success: rollbackProceed,
    notes: `decision=${rollbackGuardDecision?.decision ?? 'missing'}`,
  },
  {
    name: 'Transition Validated By Audit',
    success: transitionValid,
    notes: `transitionValid=${transitionValid}`,
  },
  {
    name: 'Dwell Policy Allows Execution',
    success: !dwellBlocked,
    notes: `blockedByDwell=${dwellBlocked}`,
  },
  {
    name: 'Target Phase Resolved In Plan',
    success: Boolean(targetPhase) && targetPhaseExistsInPlan,
    notes: `targetPhase=${targetPhase ?? 'unknown'}`,
  },
  {
    name: 'Target Env Artifact Present',
    success: envFilePresent,
    notes: `envFile=${envPath ?? 'missing'}`,
  },
  {
    name: 'Governor Deploy Conditions',
    success: !enforceGovernor || shouldDeploy,
    notes: `shouldDeploy=${shouldDeploy} enforce=${enforceGovernor} action=${governorAction}`,
  },
];

const details = [
  `Source Decision: ${sourceDecision}`,
  `Governor Action: ${governorAction}`,
  `Target Phase: ${targetPhase ?? 'unknown'}`,
  `Release Ready: ${releaseReady}`,
  `Rollback Proceed: ${rollbackProceed}`,
  `Transition Valid: ${transitionValid}`,
  `Dwell Blocked: ${dwellBlocked}`,
  `Target Env: ${envPath ?? 'missing'}`,
];

const executeScriptPath = join(REPORT_DIR, 'rollout-governor-execute.sh');
const scriptLines = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '',
  `export ROLLOUT_GOVERNOR_ACTION="${governorAction}"`,
  `export ROLLOUT_GOVERNOR_SOURCE_DECISION="${sourceDecision}"`,
  `export ROLLOUT_GOVERNOR_TARGET_PHASE="${targetPhase ?? ''}"`,
  '',
  'if [[ "$ROLLOUT_GOVERNOR_ACTION" != DEPLOY_* ]]; then',
  '  echo "Rollout governor blocked deploy: $ROLLOUT_GOVERNOR_ACTION"',
  '  exit 1',
  'fi',
  '',
  `set -a && source "${envPath ?? ''}" && set +a`,
  'echo "Deploying governed rollout phase: $ROLLOUT_GOVERNOR_TARGET_PHASE"',
  'npx wrangler deploy',
  '',
];

ensureDir(REPORT_DIR);
writeFileSync(executeScriptPath, scriptLines.join('\n'), { encoding: 'utf8', mode: 0o755 });

const report = writeAgentReport({
  id: 'rollout-phase-governor',
  title: 'Rollout Phase Governor Agent Report',
  summary:
    'Aggregates release, rollback, transition, and dwell signals into a single deploy-or-hold decision with an executable rollout script.',
  checks,
  details,
  mode,
  extra: {
    source_decision: sourceDecision,
    governor_action: governorAction,
    target_phase: targetPhase,
    should_deploy: shouldDeploy,
    enforce_governor: enforceGovernor,
    target_env_file: envPath,
    execute_script: executeScriptPath,
  },
});

writeFileSync(
  join(REPORT_DIR, 'rollout-governor-decision.json'),
  `${JSON.stringify(
    {
      source_decision: sourceDecision,
      governor_action: governorAction,
      target_phase: targetPhase,
      should_deploy: shouldDeploy,
      enforce_governor: enforceGovernor,
      target_env_file: envPath,
      execute_script: executeScriptPath,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const markdown = [
  '# Rollout Phase Governor Decision',
  '',
  `- Generated At: ${new Date().toISOString()}`,
  `- Source Decision: ${sourceDecision}`,
  `- Governor Action: ${governorAction}`,
  `- Target Phase: ${targetPhase ?? 'unknown'}`,
  `- Should Deploy: ${shouldDeploy ? 'yes' : 'no'}`,
  `- Target Env File: ${envPath ?? 'missing'}`,
  `- Execute Script: ${executeScriptPath}`,
  '',
  '## Signals',
  '',
  `- Release Ready: ${releaseReady}`,
  `- Rollback Guard Proceed: ${rollbackProceed}`,
  `- Transition Valid: ${transitionValid}`,
  `- Dwell Blocked: ${dwellBlocked}`,
  '',
  '## Next Command',
  '',
  `- Execute governed rollout: \`${executeScriptPath}\``,
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-phase-governor.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log('Report written: output/agent-reports/rollout-phase-governor.md');
console.log('Decision written: output/agent-reports/rollout-governor-decision.json');
exitForStatus(report);
