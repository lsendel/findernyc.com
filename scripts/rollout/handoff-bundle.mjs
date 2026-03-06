import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPORT_DIR, ensureDir, writeAgentReport, exitForStatus, getMode } from '../agents/lib.mjs';

function readJsonOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const mode = getMode();
const enforceCompleteBundle = process.env.ROLLOUT_HANDOFF_ENFORCE === '1';

const requiredArtifacts = [
  { id: 'feature-rollout-plan', path: 'output/agent-reports/feature-flag-rollout-plan.json' },
  { id: 'rollback-guard', path: 'output/agent-reports/rollback-guard-decision.json' },
  { id: 'phase-execution', path: 'output/agent-reports/rollout-phase-execution.json' },
  { id: 'phase-promotion', path: 'output/agent-reports/rollout-promotion-decision.json' },
  { id: 'phase-audit', path: 'output/agent-reports/rollout-phase-audit.json' },
  { id: 'phase-dwell', path: 'output/agent-reports/rollout-dwell-decision.json' },
  { id: 'phase-governor', path: 'output/agent-reports/rollout-governor-decision.json' },
  { id: 'deployment-manifest', path: 'output/agent-reports/rollout-deployment-manifest.json' },
  { id: 'rollback-rehearsal', path: 'output/agent-reports/rollout-rollback-rehearsal.json' },
];

const artifactStates = requiredArtifacts.map((artifact) => ({
  ...artifact,
  exists: existsSync(artifact.path),
  payload: readJsonOrNull(artifact.path),
}));

const presentCount = artifactStates.filter((artifact) => artifact.exists).length;
const missing = artifactStates.filter((artifact) => !artifact.exists).map((artifact) => artifact.id);
const completenessPercent = Number(((presentCount / requiredArtifacts.length) * 100).toFixed(1));

const governorDecision = readJsonOrNull('output/agent-reports/rollout-governor-decision.json');
const manifestDecision = readJsonOrNull('output/agent-reports/rollout-deployment-manifest.json');
const rehearsalDecision = readJsonOrNull('output/agent-reports/rollout-rollback-rehearsal.json');

const targetPhase =
  governorDecision?.target_phase ??
  governorDecision?.extra?.target_phase ??
  manifestDecision?.governor?.target_phase ??
  manifestDecision?.extra?.governor?.target_phase ??
  null;
const governorAction = governorDecision?.governor_action ?? governorDecision?.extra?.governor_action ?? 'UNKNOWN';
const rollbackPhase = rehearsalDecision?.extra?.rollback_phase ?? rehearsalDecision?.rollback_phase ?? null;
const deployReady =
  manifestDecision?.deploy_ready ??
  manifestDecision?.extra?.deploy_ready ??
  null;

const checks = [
  {
    name: 'Required Rollout Artifacts Present',
    success: !enforceCompleteBundle || presentCount === requiredArtifacts.length,
    notes: `present=${presentCount}/${requiredArtifacts.length} enforce=${enforceCompleteBundle}`,
  },
  {
    name: 'Governor Decision Context Available',
    success: Boolean(governorDecision?.governor_action),
    notes: `action=${governorAction} target=${targetPhase ?? 'unknown'}`,
  },
  {
    name: 'Rollback Rehearsal Context Available',
    success: Boolean(rollbackPhase),
    notes: `rollbackPhase=${rollbackPhase ?? 'unknown'}`,
  },
  {
    name: 'Deployment Manifest Context Available',
    success: deployReady !== null,
    notes: `deployReady=${deployReady ?? 'unknown'}`,
  },
];

const handoffBundle = {
  generatedAt: new Date().toISOString(),
  completeness_percent: completenessPercent,
  present: presentCount,
  total: requiredArtifacts.length,
  missing,
  rollout_context: {
    governor_action: governorAction,
    target_phase: targetPhase,
    rollback_phase: rollbackPhase,
    deploy_ready: deployReady,
  },
  artifacts: artifactStates.map((artifact) => ({
    id: artifact.id,
    path: artifact.path,
    exists: artifact.exists,
  })),
};

ensureDir(REPORT_DIR);
writeFileSync(
  join(REPORT_DIR, 'rollout-handoff-bundle.json'),
  `${JSON.stringify(handoffBundle, null, 2)}\n`,
  'utf8',
);

const details = [
  `completeness: ${completenessPercent}% (${presentCount}/${requiredArtifacts.length})`,
  `missing: ${missing.length > 0 ? missing.join(', ') : 'none'}`,
  `governor action: ${governorAction}`,
  `target phase: ${targetPhase ?? 'unknown'}`,
  `rollback phase: ${rollbackPhase ?? 'unknown'}`,
];

const report = writeAgentReport({
  id: 'rollout-handoff-bundle',
  title: 'Rollout Handoff Bundle Agent Report',
  summary:
    'Aggregates required rollout artifacts into a single handoff bundle with completeness scoring for operational handoff.',
  checks,
  details,
  mode,
  extra: handoffBundle,
});

const markdown = [
  '# Rollout Handoff Bundle',
  '',
  `- Generated At: ${handoffBundle.generatedAt}`,
  `- Completeness: ${completenessPercent}% (${presentCount}/${requiredArtifacts.length})`,
  `- Governor Action: ${governorAction}`,
  `- Target Phase: ${targetPhase ?? 'unknown'}`,
  `- Rollback Phase: ${rollbackPhase ?? 'unknown'}`,
  '',
  '## Missing Artifacts',
  '',
  ...(missing.length > 0 ? missing.map((item) => `- ${item}`) : ['- none']),
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-handoff-bundle.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log('Report written: output/agent-reports/rollout-handoff-bundle.md');
exitForStatus(report);
