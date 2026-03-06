import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { REPORT_DIR, ensureDir, writeAgentReport, exitForStatus, getMode } from '../agents/lib.mjs';

const PHASE_ORDER = ['canary', 'partial', 'full'];
const HISTORY_LIMIT = 100;

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

function phaseIndex(phase) {
  return PHASE_ORDER.indexOf(phase);
}

function detectTransitionType(currentPhase, recommendedPhase) {
  const delta = phaseIndex(recommendedPhase) - phaseIndex(currentPhase);
  if (delta === 0) return 'hold';
  if (delta === 1) return 'promote';
  if (delta === -1) return 'rollback';
  if (delta > 1) return 'skip_forward';
  return 'skip_backward';
}

const mode = getMode();
const rolloutPlan = readJsonOrNull('output/agent-reports/feature-flag-rollout-plan.json');
const phaseExecution = readJsonOrNull('output/agent-reports/rollout-phase-execution.json');
const promotionDecision = readJsonOrNull('output/agent-reports/rollout-promotion-decision.json');
const rollbackGuard = readJsonOrNull('output/agent-reports/rollback-guard-decision.json');

const currentPhase =
  normalizePhase(promotionDecision?.current_phase) ??
  normalizePhase(phaseExecution?.extra?.target_phase);
const recommendedPhase = normalizePhase(promotionDecision?.recommended_phase) ?? currentPhase;
const decision = (promotionDecision?.decision ?? 'UNKNOWN').toString().trim().toUpperCase();
const transitionType =
  currentPhase && recommendedPhase ? detectTransitionType(currentPhase, recommendedPhase) : 'unknown';

const validPhases = Boolean(currentPhase) && Boolean(recommendedPhase);
const validDecisionPattern =
  (transitionType === 'hold' && decision.startsWith('HOLD')) ||
  (transitionType === 'promote' && decision === `PROMOTE_TO_${recommendedPhase?.toUpperCase()}`) ||
  (transitionType === 'rollback' && decision === `ROLLBACK_TO_${recommendedPhase?.toUpperCase()}`);
const allowedTransitionTypes = new Set(['hold', 'promote', 'rollback']);
const validTransition = allowedTransitionTypes.has(transitionType) && validDecisionPattern;

const planPhases = rolloutPlan?.extra?.phases ?? [];
const recommendedPhaseExistsInPlan = planPhases.some((phase) => phase.phase === recommendedPhase);
const recommendedPhasePlan = planPhases.find((phase) => phase.phase === recommendedPhase) ?? null;

ensureDir(REPORT_DIR);
const historyPath = join(REPORT_DIR, 'rollout-phase-history.json');
const existingHistory = readJsonOrNull(historyPath);
const history = Array.isArray(existingHistory) ? existingHistory : [];
const historyEntry = {
  timestamp: new Date().toISOString(),
  current_phase: currentPhase,
  recommended_phase: recommendedPhase,
  decision,
  transition_type: transitionType,
  transition_valid: validTransition,
  rollback_guard_decision: rollbackGuard?.decision ?? 'UNKNOWN',
};
const updatedHistory = [...history, historyEntry].slice(-HISTORY_LIMIT);
writeFileSync(historyPath, `${JSON.stringify(updatedHistory, null, 2)}\n`, 'utf8');

const envFile = promotionDecision?.env_file ?? join(REPORT_DIR, `rollout-phase-${recommendedPhase ?? 'canary'}.env`);
const commandScriptPath = join(REPORT_DIR, 'rollout-apply-next.sh');
const commandScript = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '',
  `export ROLLOUT_DECISION="${decision}"`,
  `export ROLLOUT_CURRENT_PHASE="${currentPhase ?? ''}"`,
  `export ROLLOUT_RECOMMENDED_PHASE="${recommendedPhase ?? ''}"`,
  '',
  `set -a && source "${envFile}" && set +a`,
  'echo "Applying rollout phase: $ROLLOUT_RECOMMENDED_PHASE (decision: $ROLLOUT_DECISION)"',
  'npx wrangler deploy',
  '',
].join('\n');
writeFileSync(commandScriptPath, commandScript, { encoding: 'utf8', mode: 0o755 });

const checks = [
  {
    name: 'Rollout Plan Artifact Present',
    success: Boolean(rolloutPlan),
    notes: rolloutPlan ? 'feature-flag-rollout-plan.json loaded' : 'missing rollout plan artifact',
  },
  {
    name: 'Promotion Decision Artifact Present',
    success: Boolean(promotionDecision),
    notes: promotionDecision ? 'rollout-promotion-decision.json loaded' : 'missing promotion decision artifact',
  },
  {
    name: 'Execution Artifact Present',
    success: Boolean(phaseExecution),
    notes: phaseExecution ? 'rollout-phase-execution.json loaded' : 'missing phase execution artifact',
  },
  {
    name: 'Current and Recommended Phases Resolved',
    success: validPhases,
    notes: `current=${currentPhase ?? 'unknown'} recommended=${recommendedPhase ?? 'unknown'}`,
  },
  {
    name: 'Transition Pattern Valid',
    success: validTransition,
    notes: `type=${transitionType} decision=${decision}`,
  },
  {
    name: 'Recommended Phase Present in Rollout Plan',
    success: recommendedPhaseExistsInPlan,
    notes: `recommended=${recommendedPhase ?? 'unknown'}`,
  },
  {
    name: 'Transition History Updated',
    success: updatedHistory.length > 0,
    notes: `historyEntries=${updatedHistory.length}`,
  },
];

const details = [
  `Current Phase: ${currentPhase ?? 'unknown'}`,
  `Recommended Phase: ${recommendedPhase ?? 'unknown'}`,
  `Decision: ${decision}`,
  `Transition Type: ${transitionType}`,
  `Transition Valid: ${validTransition}`,
  `Rollback Guard Decision: ${rollbackGuard?.decision ?? 'UNKNOWN'}`,
  `Recommended Flags (${recommendedPhasePlan?.enabled_flags?.length ?? 0}): ${recommendedPhasePlan?.enabled_flags?.join(', ') ?? 'none'}`,
  `History File: ${historyPath}`,
  `Apply Command Script: ${commandScriptPath}`,
];

const report = writeAgentReport({
  id: 'rollout-phase-audit',
  title: 'Rollout Phase Audit Agent Report',
  summary: 'Validates rollout phase transition decisions and persists a machine-readable history for weekly rollout governance.',
  checks,
  details,
  mode,
  extra: {
    current_phase: currentPhase,
    recommended_phase: recommendedPhase,
    decision,
    transition_type: transitionType,
    transition_valid: validTransition,
    history_entries: updatedHistory.length,
    history_file: historyPath,
    apply_script: commandScriptPath,
  },
});

const markdown = [
  '# Rollout Phase Audit',
  '',
  `- Generated At: ${new Date().toISOString()}`,
  `- Current Phase: ${currentPhase ?? 'unknown'}`,
  `- Recommended Phase: ${recommendedPhase ?? 'unknown'}`,
  `- Decision: ${decision}`,
  `- Transition Type: ${transitionType}`,
  `- Transition Valid: ${validTransition ? 'yes' : 'no'}`,
  `- History Entries: ${updatedHistory.length}`,
  '',
  '## Apply Script',
  '',
  `- Script: ${commandScriptPath}`,
  `- Env File: ${envFile}`,
  '',
  '## Recent History',
  '',
  ...updatedHistory
    .slice(-5)
    .reverse()
    .map(
      (item) =>
        `- ${item.timestamp}: ${item.current_phase ?? 'unknown'} -> ${item.recommended_phase ?? 'unknown'} (${item.decision}) [${item.transition_type}] valid=${item.transition_valid}`,
    ),
  '',
];

writeFileSync(join(REPORT_DIR, 'rollout-phase-audit.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log('Report written: output/agent-reports/rollout-phase-audit.md');
exitForStatus(report);
