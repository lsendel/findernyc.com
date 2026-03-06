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

function detectTransitionType(currentPhase, recommendedPhase) {
  const delta = phaseIndex(recommendedPhase) - phaseIndex(currentPhase);
  if (delta === 0) return 'hold';
  if (delta === 1) return 'promote';
  if (delta === -1) return 'rollback';
  if (delta > 1) return 'skip_forward';
  return 'skip_backward';
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toTimestamp(value) {
  const date = new Date(value ?? '');
  const ts = date.getTime();
  return Number.isFinite(ts) ? ts : null;
}

function findLatestPhaseTimestamp(historyEntries, phase) {
  let latest = null;
  for (const entry of historyEntries) {
    const touchesPhase = entry?.current_phase === phase || entry?.recommended_phase === phase;
    if (!touchesPhase) continue;
    const ts = toTimestamp(entry?.timestamp);
    if (ts === null) continue;
    if (latest === null || ts > latest) {
      latest = ts;
    }
  }
  return latest;
}

const mode = getMode();
const minDwellHours = toNumber(process.env.ROLLOUT_MIN_DWELL_HOURS, 24);
const enforceDwell = process.env.ROLLOUT_DWELL_ENFORCE === '1';
const nowTs = toTimestamp(process.env.ROLLOUT_NOW_ISO) ?? Date.now();
const nowIso = new Date(nowTs).toISOString();

const promotionDecision = readJsonOrNull('output/agent-reports/rollout-promotion-decision.json');
const historyData = readJsonOrNull('output/agent-reports/rollout-phase-history.json');
const history = Array.isArray(historyData) ? historyData : [];

const currentPhase = normalizePhase(promotionDecision?.current_phase);
const recommendedPhase = normalizePhase(promotionDecision?.recommended_phase);
const decision = (promotionDecision?.decision ?? 'UNKNOWN').toString().trim().toUpperCase();
const transitionType =
  currentPhase && recommendedPhase ? detectTransitionType(currentPhase, recommendedPhase) : 'unknown';

const isPromotion = transitionType === 'promote';
const latestPhaseTimestamp = currentPhase ? findLatestPhaseTimestamp(history, currentPhase) : null;
const hoursSinceCurrentPhaseTouch =
  latestPhaseTimestamp === null ? Number.POSITIVE_INFINITY : (nowTs - latestPhaseTimestamp) / 3600000;
const dwellSatisfied = !isPromotion || hoursSinceCurrentPhaseTouch >= minDwellHours;
const blockedByDwell = isPromotion && !dwellSatisfied;

const effectiveRecommendedPhase = blockedByDwell ? currentPhase : recommendedPhase;
const effectiveDecision =
  blockedByDwell && currentPhase ? `HOLD_${currentPhase.toUpperCase()}_DWELL` : decision;

const checks = [
  {
    name: 'Promotion Decision Artifact Present',
    success: Boolean(promotionDecision),
    notes: promotionDecision ? 'rollout-promotion-decision.json loaded' : 'missing promotion decision artifact',
  },
  {
    name: 'History Artifact Present',
    success: Array.isArray(historyData),
    notes: Array.isArray(historyData) ? `entries=${history.length}` : 'rollout-phase-history.json missing',
  },
  {
    name: 'Transition Type Resolved',
    success: Boolean(currentPhase) && Boolean(recommendedPhase),
    notes: `current=${currentPhase ?? 'unknown'} recommended=${recommendedPhase ?? 'unknown'} type=${transitionType}`,
  },
  {
    name: 'Minimum Dwell Time Satisfied',
    success: !enforceDwell || dwellSatisfied,
    notes: `promote=${isPromotion} dwellSatisfied=${dwellSatisfied} hoursSince=${Number.isFinite(hoursSinceCurrentPhaseTouch) ? hoursSinceCurrentPhaseTouch.toFixed(2) : 'inf'} min=${minDwellHours} enforce=${enforceDwell}`,
  },
  {
    name: 'Effective Decision Computed',
    success: Boolean(effectiveDecision) && Boolean(effectiveRecommendedPhase),
    notes: `effectiveDecision=${effectiveDecision} effectivePhase=${effectiveRecommendedPhase ?? 'unknown'}`,
  },
];

const details = [
  `Now: ${nowIso}`,
  `Current Phase: ${currentPhase ?? 'unknown'}`,
  `Recommended Phase: ${recommendedPhase ?? 'unknown'}`,
  `Original Decision: ${decision}`,
  `Transition Type: ${transitionType}`,
  `Hours Since Current Phase Touch: ${Number.isFinite(hoursSinceCurrentPhaseTouch) ? hoursSinceCurrentPhaseTouch.toFixed(2) : 'inf'}`,
  `Min Dwell Hours: ${minDwellHours}`,
  `Enforce Dwell: ${enforceDwell}`,
  `Blocked By Dwell: ${blockedByDwell}`,
  `Effective Decision: ${effectiveDecision}`,
  `Effective Recommended Phase: ${effectiveRecommendedPhase ?? 'unknown'}`,
];

const decisionPath = join(REPORT_DIR, 'rollout-dwell-decision.json');
const report = writeAgentReport({
  id: 'rollout-phase-dwell',
  title: 'Rollout Phase Dwell Agent Report',
  summary: 'Applies minimum dwell-time policy before phase promotion and emits an effective promotion/hold decision.',
  checks,
  details,
  mode,
  extra: {
    now_iso: nowIso,
    min_dwell_hours: minDwellHours,
    enforce_dwell: enforceDwell,
    current_phase: currentPhase,
    recommended_phase: recommendedPhase,
    transition_type: transitionType,
    hours_since_current_phase_touch: Number.isFinite(hoursSinceCurrentPhaseTouch)
      ? Number(hoursSinceCurrentPhaseTouch.toFixed(2))
      : null,
    blocked_by_dwell: blockedByDwell,
    effective_decision: effectiveDecision,
    effective_recommended_phase: effectiveRecommendedPhase,
  },
});

ensureDir(REPORT_DIR);
writeFileSync(
  decisionPath,
  `${JSON.stringify(
    {
      now: nowIso,
      min_dwell_hours: minDwellHours,
      enforce_dwell: enforceDwell,
      blocked_by_dwell: blockedByDwell,
      current_phase: currentPhase,
      recommended_phase: recommendedPhase,
      effective_decision: effectiveDecision,
      effective_recommended_phase: effectiveRecommendedPhase,
      source_decision: decision,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const markdown = [
  '# Rollout Phase Dwell Decision',
  '',
  `- Generated At: ${nowIso}`,
  `- Current Phase: ${currentPhase ?? 'unknown'}`,
  `- Recommended Phase: ${recommendedPhase ?? 'unknown'}`,
  `- Transition Type: ${transitionType}`,
  `- Min Dwell Hours: ${minDwellHours}`,
  `- Hours Since Phase Touch: ${Number.isFinite(hoursSinceCurrentPhaseTouch) ? hoursSinceCurrentPhaseTouch.toFixed(2) : 'inf'}`,
  `- Blocked By Dwell: ${blockedByDwell ? 'yes' : 'no'}`,
  `- Effective Decision: ${effectiveDecision}`,
  `- Effective Recommended Phase: ${effectiveRecommendedPhase ?? 'unknown'}`,
  '',
  '## Next Command',
  '',
  `- Execute effective phase: \`ROLLOUT_TARGET_PHASE=${effectiveRecommendedPhase ?? 'canary'} npm run rollout:execute\``,
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-phase-dwell.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log('Report written: output/agent-reports/rollout-phase-dwell.md');
console.log('Decision written: output/agent-reports/rollout-dwell-decision.json');
exitForStatus(report);
