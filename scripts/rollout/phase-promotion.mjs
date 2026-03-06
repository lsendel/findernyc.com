import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
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

function phaseIndex(phase) {
  return PHASE_ORDER.indexOf(phase);
}

function nextPhase(phase) {
  const idx = phaseIndex(phase);
  if (idx < 0 || idx + 1 >= PHASE_ORDER.length) return null;
  return PHASE_ORDER[idx + 1];
}

function previousPhase(phase) {
  const idx = phaseIndex(phase);
  if (idx <= 0) return null;
  return PHASE_ORDER[idx - 1];
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

const mode = getMode();
const minPassRatePercent = toNumber(process.env.ROLLOUT_MIN_PASS_RATE_PERCENT, 98);
const maxFailedChecks = toNumber(process.env.ROLLOUT_MAX_FAILED_CHECKS, 0);
const maxFailingAgents = toNumber(process.env.ROLLOUT_MAX_FAILING_AGENTS, 0);
const enforceKpiHealthy = process.env.ROLLOUT_PROMOTION_ENFORCE_KPI === '1';
const enforceForwardProgression = process.env.ROLLOUT_PROMOTION_ENFORCE_FORWARD === '1';

const rolloutPlan = readJsonOrNull('output/agent-reports/feature-flag-rollout-plan.json');
const phaseExecution = readJsonOrNull('output/agent-reports/rollout-phase-execution.json');
const releaseDecisionArtifact = readJsonOrNull('output/agent-reports/release-decision.json');
const rollbackGuardDecisionArtifact = readJsonOrNull('output/agent-reports/rollback-guard-decision.json');
const telemetrySnapshot = readJsonOrNull('output/agent-reports/release-telemetry-kpi-snapshot.json');

const currentPhase =
  normalizePhase(process.env.ROLLOUT_CURRENT_PHASE) ??
  normalizePhase(phaseExecution?.extra?.target_phase) ??
  'canary';

const releaseDecision = (releaseDecisionArtifact?.decision ?? 'HOLD').toString().toUpperCase();
const rollbackGuardDecision = (rollbackGuardDecisionArtifact?.decision ?? 'ROLLBACK_HOLD')
  .toString()
  .toUpperCase();
const failedChecks = toNumber(telemetrySnapshot?.checkSnapshot?.failed, Number.POSITIVE_INFINITY);
const passRatePercent = toNumber(telemetrySnapshot?.checkSnapshot?.passRatePercent, 0);
const failingAgents = toNumber(telemetrySnapshot?.agentSnapshot?.fail, Number.POSITIVE_INFINITY);

const isReleaseReady = releaseDecision === 'READY';
const isRollbackGuardProceed = rollbackGuardDecision === 'PROCEED';
const isKpiHealthy =
  failedChecks <= maxFailedChecks &&
  passRatePercent >= minPassRatePercent &&
  failingAgents <= maxFailingAgents;
const hasReleaseDecision = releaseDecision === 'READY' || releaseDecision === 'HOLD';
const hasRollbackGuardDecision =
  rollbackGuardDecision === 'PROCEED' || rollbackGuardDecision === 'ROLLBACK_HOLD';

const plannedPhases = rolloutPlan?.extra?.phases ?? [];
const currentPhasePlan = plannedPhases.find((phase) => phase.phase === currentPhase) ?? null;
const targetPromotePhase = nextPhase(currentPhase);

let decision = `HOLD_${currentPhase.toUpperCase()}`;
let recommendedPhase = currentPhase;
const rationale = [];

if (currentPhase === 'full') {
  if (isReleaseReady && isRollbackGuardProceed && isKpiHealthy) {
    decision = 'HOLD_AT_FULL';
    recommendedPhase = 'full';
    rationale.push('Already at full rollout with healthy release and KPI signals.');
  } else {
    const fallback = previousPhase(currentPhase) ?? 'canary';
    decision = `ROLLBACK_TO_${fallback.toUpperCase()}`;
    recommendedPhase = fallback;
    rationale.push('Full rollout signals degraded; recommend rollback to lower-risk phase.');
  }
} else if (isReleaseReady && isRollbackGuardProceed && isKpiHealthy && targetPromotePhase) {
  decision = `PROMOTE_TO_${targetPromotePhase.toUpperCase()}`;
  recommendedPhase = targetPromotePhase;
  rationale.push(`Release gates and KPI thresholds are healthy; promote ${currentPhase} -> ${targetPromotePhase}.`);
} else if (!isReleaseReady || !isRollbackGuardProceed) {
  const fallback = previousPhase(currentPhase) ?? 'canary';
  if (currentPhase === 'canary') {
    decision = 'HOLD_CANARY';
    recommendedPhase = 'canary';
    rationale.push('Initial canary must stay in place until release and rollback gates recover.');
  } else {
    decision = `ROLLBACK_TO_${fallback.toUpperCase()}`;
    recommendedPhase = fallback;
    rationale.push('Release readiness or rollback guard failed; recommend rollback to previous phase.');
  }
} else {
  decision = `HOLD_${currentPhase.toUpperCase()}`;
  recommendedPhase = currentPhase;
  rationale.push('KPI thresholds not yet met for safe promotion.');
}

const recommendedPhasePlan = plannedPhases.find((phase) => phase.phase === recommendedPhase) ?? null;
const enabledFlags = recommendedPhasePlan?.enabled_flags ?? [];
const envFile = join(REPORT_DIR, `rollout-phase-${recommendedPhase}.env`);
const envPayload = [
  `FEATURE_FLAGS=${enabledFlags.join(',')}`,
  `ROLLOUT_PHASE=${recommendedPhase}`,
  `ROLLOUT_PROMOTION_DECISION=${decision}`,
  `ROLLBACK_GUARD_DECISION=${rollbackGuardDecision}`,
  `ROLLOUT_GENERATED_AT=${new Date().toISOString()}`,
  '',
].join('\n');

ensureDir(REPORT_DIR);
writeFileSync(envFile, envPayload, 'utf8');

const allowsForwardProgression = decision.startsWith('PROMOTE_TO_') || decision === 'HOLD_AT_FULL';

const checks = [
  {
    name: 'Rollout Plan Artifact Present',
    success: Boolean(rolloutPlan),
    notes: rolloutPlan ? 'feature-flag-rollout-plan.json loaded' : 'missing rollout plan artifact',
  },
  {
    name: 'Current Phase Resolved',
    success: Boolean(currentPhasePlan),
    notes: `currentPhase=${currentPhase}`,
  },
  {
    name: 'Release Decision Artifact Present',
    success: hasReleaseDecision,
    notes: `decision=${releaseDecision}`,
  },
  {
    name: 'Rollback Guard Decision Artifact Present',
    success: hasRollbackGuardDecision,
    notes: `decision=${rollbackGuardDecision}`,
  },
  {
    name: 'KPI Thresholds Healthy',
    success: !enforceKpiHealthy || isKpiHealthy,
    notes: `healthy=${isKpiHealthy} passRate=${passRatePercent.toFixed(1)} failedChecks=${failedChecks} failingAgents=${failingAgents} enforce=${enforceKpiHealthy}`,
  },
  {
    name: 'Forward Progression Decision',
    success: !enforceForwardProgression || allowsForwardProgression,
    notes: `decision=${decision} forward=${allowsForwardProgression} enforce=${enforceForwardProgression}`,
  },
];

const details = [
  `Current Phase: ${currentPhase}`,
  `Recommended Phase: ${recommendedPhase}`,
  `Decision: ${decision}`,
  `Release Decision: ${releaseDecision}`,
  `Rollback Guard: ${rollbackGuardDecision}`,
  `KPI Snapshot: passRate=${passRatePercent.toFixed(1)} failedChecks=${failedChecks} failingAgents=${failingAgents}`,
  `Thresholds: minPassRate=${minPassRatePercent} maxFailedChecks=${maxFailedChecks} maxFailingAgents=${maxFailingAgents}`,
  `Enforcement: enforceKpiHealthy=${enforceKpiHealthy} enforceForwardProgression=${enforceForwardProgression}`,
  `Env Artifact: ${envFile}`,
  `Rationale: ${rationale.join(' | ')}`,
];

const report = writeAgentReport({
  id: 'rollout-phase-promotion',
  title: 'Rollout Phase Promotion Agent Report',
  summary:
    'Computes phase promotion/rollback decisions using release gate, rollback guard, and KPI threshold signals.',
  checks,
  details,
  mode,
  extra: {
    current_phase: currentPhase,
    recommended_phase: recommendedPhase,
    decision,
    thresholds: {
      min_pass_rate_percent: minPassRatePercent,
      max_failed_checks: maxFailedChecks,
      max_failing_agents: maxFailingAgents,
      enforce_kpi_healthy: enforceKpiHealthy,
      enforce_forward_progression: enforceForwardProgression,
    },
    indicators: {
      release_decision: releaseDecision,
      rollback_guard_decision: rollbackGuardDecision,
      pass_rate_percent: Number(passRatePercent.toFixed(1)),
      failed_checks: failedChecks,
      failing_agents: failingAgents,
    },
    allows_forward_progression: allowsForwardProgression,
    env_file: envFile,
    enabled_flags: enabledFlags,
  },
});

writeFileSync(
  join(REPORT_DIR, 'rollout-promotion-decision.json'),
  `${JSON.stringify(
    {
      decision,
      current_phase: currentPhase,
      recommended_phase: recommendedPhase,
      env_file: envFile,
      rationale,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const markdown = [
  '# Rollout Phase Promotion Decision',
  '',
  `- Generated At: ${new Date().toISOString()}`,
  `- Current Phase: ${currentPhase}`,
  `- Recommended Phase: ${recommendedPhase}`,
  `- Decision: ${decision}`,
  `- Env File: ${envFile}`,
  '',
  '## Signals',
  '',
  `- Release Decision: ${releaseDecision}`,
  `- Rollback Guard: ${rollbackGuardDecision}`,
  `- KPI Pass Rate: ${passRatePercent.toFixed(1)}% (min ${minPassRatePercent}%)`,
  `- Failed Checks: ${failedChecks} (max ${maxFailedChecks})`,
  `- Failing Agents: ${failingAgents} (max ${maxFailingAgents})`,
  '',
  '## Rationale',
  '',
  ...rationale.map((line) => `- ${line}`),
  '',
  '## Next Command',
  '',
  `- Execute recommendation: \`ROLLOUT_TARGET_PHASE=${recommendedPhase} npm run rollout:execute\``,
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-phase-promotion.md'), markdown.join('\n'), 'utf8');

console.log('Report written: output/agent-reports/rollout-phase-promotion.md');
console.log('Decision written: output/agent-reports/rollout-promotion-decision.json');
exitForStatus(report);
