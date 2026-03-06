import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { REPORT_DIR, ensureDir, writeAgentReport, exitForStatus, getMode } from '../agents/lib.mjs';
import { evaluateRollbackGuard } from './lib.mjs';

function readJsonOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const mode = getMode();
const inputs = {
  releaseDecision: readJsonOrNull('output/agent-reports/release-decision.json'),
  prQuality: readJsonOrNull('output/agent-reports/pr-quality.json'),
  apiContract: readJsonOrNull('output/agent-reports/api-contract.json'),
  analyticsIntegrity: readJsonOrNull('output/agent-reports/analytics-integrity.json'),
  releaseGate: readJsonOrNull('output/agent-reports/release-gate.json'),
};

const evaluation = evaluateRollbackGuard(inputs);
const checks = evaluation.checks;
const details = [
  `Decision: ${evaluation.decision}`,
  `Passed: ${evaluation.passed}/${evaluation.total}`,
  `Failed: ${evaluation.failed}`,
];

const report = writeAgentReport({
  id: 'rollback-guard',
  title: 'Rollback Guard Agent Report',
  summary: 'Evaluates release-critical agent outputs and emits a proceed/hold decision for staged rollout phases.',
  checks,
  details,
  mode,
  extra: {
    decision: evaluation.decision,
    inputs_present: Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, Boolean(value)])),
  },
});

ensureDir(REPORT_DIR);
const markdown = [
  '# Rollback Guard Decision',
  '',
  `- Generated At: ${new Date().toISOString()}`,
  `- Decision: ${evaluation.decision}`,
  `- Passed Checks: ${evaluation.passed}/${evaluation.total}`,
  '',
  '## Checks',
  '',
  ...evaluation.checks.map((check) => `- [${check.success ? 'x' : ' '}] ${check.name} (${check.notes})`),
  '',
  '## Policy',
  '',
  '- `PROCEED`: all release-critical checks passed.',
  '- `ROLLBACK_HOLD`: any release-critical check failed; freeze rollout progression and keep rollback path active.',
  '',
];
writeFileSync(join(REPORT_DIR, 'rollback-guard.md'), markdown.join('\n'), 'utf8');
writeFileSync(
  join(REPORT_DIR, 'rollback-guard-decision.json'),
  `${JSON.stringify({ decision: evaluation.decision, checks: evaluation.checks }, null, 2)}\n`,
  'utf8',
);

console.log('Report written: output/agent-reports/rollback-guard.md');
exitForStatus(report);
