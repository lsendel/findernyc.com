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

function previousPhase(phase) {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx < 0) return null;
  return idx === 0 ? 'canary' : PHASE_ORDER[idx - 1];
}

const mode = getMode();
const enforceConsistency = process.env.ROLLOUT_CONSISTENCY_ENFORCE === '1';

const governor = readJsonOrNull('output/agent-reports/rollout-governor-decision.json');
const manifest = readJsonOrNull('output/agent-reports/rollout-deployment-manifest.json');
const rehearsal = readJsonOrNull('output/agent-reports/rollout-rollback-rehearsal.json');
const dwell = readJsonOrNull('output/agent-reports/rollout-dwell-decision.json');
const promotion = readJsonOrNull('output/agent-reports/rollout-promotion-decision.json');

const governorPhase = normalizePhase(governor?.target_phase);
const manifestPhase = normalizePhase(manifest?.governor?.target_phase);
const dwellPhase = normalizePhase(dwell?.effective_recommended_phase);
const promotionPhase = normalizePhase(promotion?.recommended_phase);
const rehearsalSource = normalizePhase(rehearsal?.extra?.source_phase ?? rehearsal?.source_phase);
const rehearsalRollback = normalizePhase(rehearsal?.extra?.rollback_phase ?? rehearsal?.rollback_phase);

const expectedRollback = governorPhase ? previousPhase(governorPhase) : null;
const phaseChainAligned =
  governorPhase &&
  manifestPhase &&
  dwellPhase &&
  promotionPhase &&
  governorPhase === manifestPhase &&
  governorPhase === dwellPhase &&
  governorPhase === promotionPhase;
const rehearsalAligned =
  governorPhase &&
  rehearsalSource &&
  rehearsalRollback &&
  rehearsalSource === governorPhase &&
  rehearsalRollback === expectedRollback;

const envPath = manifest?.artifacts?.env_file ?? governor?.target_env_file ?? null;
const envFilePresent = Boolean(envPath && existsSync(envPath));

const checks = [
  {
    name: 'Governor and Manifest Artifacts Present',
    success: Boolean(governor) && Boolean(manifest),
    notes: `governor=${Boolean(governor)} manifest=${Boolean(manifest)}`,
  },
  {
    name: 'Phase Chain Alignment (Governor/Manifest/Dwell/Promotion)',
    success: !enforceConsistency || Boolean(phaseChainAligned),
    notes: `governor=${governorPhase ?? 'unknown'} manifest=${manifestPhase ?? 'unknown'} dwell=${dwellPhase ?? 'unknown'} promotion=${promotionPhase ?? 'unknown'} enforce=${enforceConsistency}`,
  },
  {
    name: 'Rehearsal Alignment With Governor Phase',
    success: !enforceConsistency || Boolean(rehearsalAligned),
    notes: `source=${rehearsalSource ?? 'unknown'} rollback=${rehearsalRollback ?? 'unknown'} expectedRollback=${expectedRollback ?? 'unknown'} enforce=${enforceConsistency}`,
  },
  {
    name: 'Manifest Env Artifact Present',
    success: envFilePresent,
    notes: `envPath=${envPath ?? 'missing'}`,
  },
];

const payload = {
  generatedAt: new Date().toISOString(),
  enforce_consistency: enforceConsistency,
  phases: {
    governor: governorPhase,
    manifest: manifestPhase,
    dwell: dwellPhase,
    promotion: promotionPhase,
    rehearsal_source: rehearsalSource,
    rehearsal_rollback: rehearsalRollback,
    expected_rollback: expectedRollback,
  },
  aligned: {
    phase_chain: Boolean(phaseChainAligned),
    rehearsal_chain: Boolean(rehearsalAligned),
  },
  env_path: envPath,
  env_present: envFilePresent,
};

ensureDir(REPORT_DIR);
writeFileSync(join(REPORT_DIR, 'rollout-cross-phase-consistency.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const details = [
  `phase-chain aligned: ${Boolean(phaseChainAligned)}`,
  `rehearsal aligned: ${Boolean(rehearsalAligned)}`,
  `env path: ${envPath ?? 'missing'}`,
  `env present: ${envFilePresent}`,
];

const report = writeAgentReport({
  id: 'rollout-cross-phase-consistency',
  title: 'Rollout Cross-Phase Consistency Agent Report',
  summary: 'Validates phase and rollback-chain consistency across governor, manifest, dwell, promotion, and rehearsal artifacts.',
  checks,
  details,
  mode,
  extra: payload,
});

const markdown = [
  '# Rollout Cross-Phase Consistency',
  '',
  `- Generated At: ${payload.generatedAt}`,
  `- Enforce Consistency: ${enforceConsistency}`,
  `- Phase Chain Aligned: ${Boolean(phaseChainAligned)}`,
  `- Rehearsal Chain Aligned: ${Boolean(rehearsalAligned)}`,
  `- Env File Present: ${envFilePresent}`,
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-cross-phase-consistency.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log('Report written: output/agent-reports/rollout-cross-phase-consistency.md');
exitForStatus(report);
