import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
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

function sha256ForFile(path) {
  if (!path || !existsSync(path)) return null;
  const hash = createHash('sha256');
  hash.update(readFileSync(path));
  return hash.digest('hex');
}

const mode = getMode();
const enforceDeployAction = process.env.ROLLOUT_MANIFEST_ENFORCE_DEPLOY === '1';

const governorDecision = readJsonOrNull('output/agent-reports/rollout-governor-decision.json');
const promotionDecision = readJsonOrNull('output/agent-reports/rollout-promotion-decision.json');
const dwellDecision = readJsonOrNull('output/agent-reports/rollout-dwell-decision.json');
const auditReport = readJsonOrNull('output/agent-reports/rollout-phase-audit.json');

const governorAction = (governorDecision?.governor_action ?? 'UNKNOWN').toString().trim().toUpperCase();
const shouldDeploy = governorDecision?.should_deploy === true;
const targetPhase =
  normalizePhase(governorDecision?.target_phase) ??
  normalizePhase(dwellDecision?.effective_recommended_phase) ??
  normalizePhase(promotionDecision?.recommended_phase);

const envFile =
  (governorDecision?.target_env_file && existsSync(governorDecision.target_env_file) && governorDecision.target_env_file) ||
  (targetPhase ? join(REPORT_DIR, `rollout-phase-${targetPhase}.env`) : null);
const governorScript = join(REPORT_DIR, 'rollout-governor-execute.sh');
const envHash = sha256ForFile(envFile);
const governorScriptHash = sha256ForFile(governorScript);
const deployReady = shouldDeploy && governorAction.startsWith('DEPLOY_') && Boolean(envHash) && Boolean(governorScriptHash);

const manifest = {
  generatedAt: new Date().toISOString(),
  mode,
  governor: {
    action: governorAction,
    should_deploy: shouldDeploy,
    target_phase: targetPhase,
  },
  artifacts: {
    env_file: envFile,
    env_sha256: envHash,
    governor_script: governorScript,
    governor_script_sha256: governorScriptHash,
  },
  signals: {
    promotion_decision: promotionDecision?.decision ?? 'UNKNOWN',
    dwell_effective_decision: dwellDecision?.effective_decision ?? 'UNKNOWN',
    transition_valid: auditReport?.extra?.transition_valid === true,
  },
  deploy_ready: deployReady,
};

ensureDir(REPORT_DIR);
const manifestPath = join(REPORT_DIR, 'rollout-deployment-manifest.json');
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const handoffScriptPath = join(REPORT_DIR, 'rollout-deploy-ready.sh');
const handoffScript = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '',
  `export ROLLOUT_DEPLOY_READY="${deployReady ? '1' : '0'}"`,
  `export ROLLOUT_GOVERNOR_ACTION="${governorAction}"`,
  `export ROLLOUT_TARGET_PHASE="${targetPhase ?? ''}"`,
  '',
  'if [[ "$ROLLOUT_DEPLOY_READY" != "1" ]]; then',
  '  echo "Rollout deploy-ready check failed (action: $ROLLOUT_GOVERNOR_ACTION)."',
  '  exit 1',
  'fi',
  '',
  `"${governorScript}"`,
  '',
].join('\n');
writeFileSync(handoffScriptPath, handoffScript, { encoding: 'utf8', mode: 0o755 });

const checks = [
  {
    name: 'Governor Decision Artifact Present',
    success: Boolean(governorDecision),
    notes: governorDecision ? 'rollout-governor-decision.json loaded' : 'missing governor decision artifact',
  },
  {
    name: 'Target Phase Resolved',
    success: Boolean(targetPhase),
    notes: `targetPhase=${targetPhase ?? 'unknown'}`,
  },
  {
    name: 'Target Env Artifact Has Hash',
    success: Boolean(envHash),
    notes: `envFile=${envFile ?? 'missing'}`,
  },
  {
    name: 'Governor Execute Script Has Hash',
    success: Boolean(governorScriptHash),
    notes: `script=${governorScript}`,
  },
  {
    name: 'Deploy-Ready Manifest Conditions',
    success: !enforceDeployAction || deployReady,
    notes: `deployReady=${deployReady} enforce=${enforceDeployAction} action=${governorAction}`,
  },
];

const details = [
  `Manifest: ${manifestPath}`,
  `Handoff Script: ${handoffScriptPath}`,
  `Governor Action: ${governorAction}`,
  `Target Phase: ${targetPhase ?? 'unknown'}`,
  `Deploy Ready: ${deployReady}`,
  `Env SHA256: ${envHash ?? 'missing'}`,
  `Governor Script SHA256: ${governorScriptHash ?? 'missing'}`,
];

const report = writeAgentReport({
  id: 'rollout-deployment-manifest',
  title: 'Rollout Deployment Manifest Agent Report',
  summary: 'Builds a signed deployment manifest and deploy-ready handoff script from rollout governor artifacts.',
  checks,
  details,
  mode,
  extra: manifest,
});

const markdown = [
  '# Rollout Deployment Manifest',
  '',
  `- Generated At: ${manifest.generatedAt}`,
  `- Governor Action: ${governorAction}`,
  `- Target Phase: ${targetPhase ?? 'unknown'}`,
  `- Deploy Ready: ${deployReady ? 'yes' : 'no'}`,
  `- Manifest JSON: ${manifestPath}`,
  `- Handoff Script: ${handoffScriptPath}`,
  '',
  '## Artifact Integrity',
  '',
  `- ${envFile ? basename(envFile) : 'env file'} sha256: ${envHash ?? 'missing'}`,
  `- ${basename(governorScript)} sha256: ${governorScriptHash ?? 'missing'}`,
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-deployment-manifest.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log('Report written: output/agent-reports/rollout-deployment-manifest.md');
console.log('Manifest written: output/agent-reports/rollout-deployment-manifest.json');
exitForStatus(report);
