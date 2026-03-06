import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPORT_DIR, getMode, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const policy = process.env.RELEASE_POLICY ?? (mode === 'warn' ? 'warn' : 'standard');

const allKnownAgents = [
  'pr-quality',
  'feature-compliance',
  'api-contract',
  'analytics-integrity',
  'search-calibration',
  'neighborhood-fit-calibration',
  'recommendation-uplift-eval',
  'seo-content',
  'data-quality',
  'ui-regression',
];

function getPolicyConfig(name) {
  if (name === 'strict') {
    return {
      blockingAgents: [...allKnownAgents],
      advisoryAgents: [],
      description: 'Strict: all agents are blocking.',
    };
  }

  if (name === 'warn') {
    return {
      blockingAgents: [],
      advisoryAgents: [...allKnownAgents],
      description: 'Warn: no blocking agents; reports are advisory only.',
    };
  }

  return {
    blockingAgents: ['pr-quality', 'api-contract', 'analytics-integrity', 'seo-content'],
    advisoryAgents: ['feature-compliance', 'search-calibration', 'neighborhood-fit-calibration', 'recommendation-uplift-eval', 'data-quality', 'ui-regression'],
    description: 'Standard: core quality/contract/analytics/SEO are blocking; others advisory.',
  };
}

const config = getPolicyConfig(policy);

function readReport(id) {
  const file = join(REPORT_DIR, `${id}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readText(file));
}

const checks = [];
const reportSnapshots = [];
const missingBlocking = [];
const blockingFailures = [];

for (const id of config.blockingAgents) {
  const report = readReport(id);
  reportSnapshots.push({ id, report, role: 'blocking' });

  if (!report) {
    missingBlocking.push(id);
    checks.push({
      name: `Blocking Agent Present (${id})`,
      success: mode === 'warn' || policy === 'warn',
      notes: 'Missing report artifact',
    });
    continue;
  }

  const success = report.status === 'pass' || mode === 'warn' || policy === 'warn';
  if (!success) {
    blockingFailures.push(id);
  }

  checks.push({
    name: `Blocking Agent Status (${id})`,
    success,
    notes: `status=${report.status}`,
  });
}

for (const id of config.advisoryAgents) {
  const report = readReport(id);
  reportSnapshots.push({ id, report, role: 'advisory' });

  if (!report) {
    checks.push({
      name: `Advisory Agent Present (${id})`,
      success: true,
      notes: 'Missing report artifact (non-blocking)',
    });
    continue;
  }

  checks.push({
    name: `Advisory Agent Status (${id})`,
    success: true,
    notes: `status=${report.status}`,
  });
}

const reportFiles = existsSync(REPORT_DIR)
  ? readdirSync(REPORT_DIR).filter((name) => name.endsWith('.json'))
  : [];

const blockingErrors = [...missingBlocking, ...blockingFailures];
const releaseDecision = blockingErrors.length > 0 && mode !== 'warn' && policy !== 'warn' ? 'HOLD' : 'READY';

const changelogSections = [];
for (const snapshot of reportSnapshots) {
  if (!snapshot.report) continue;

  const failingChecks = snapshot.report.checks?.filter((check) => !check.success) ?? [];
  const passingChecks = snapshot.report.checks?.filter((check) => check.success) ?? [];

  changelogSections.push(`## ${snapshot.id} (${snapshot.role})`);
  changelogSections.push(`- status: ${snapshot.report.status}`);
  changelogSections.push(`- passing checks: ${passingChecks.length}`);
  changelogSections.push(`- failing checks: ${failingChecks.length}`);

  if (failingChecks.length > 0) {
    changelogSections.push(`- failed: ${failingChecks.map((check) => check.name).join(', ')}`);
  }

  changelogSections.push('');
}

const changelogMarkdown = [
  '# Release Gate Changelog Excerpt',
  '',
  `- decision: ${releaseDecision}`,
  `- policy: ${policy}`,
  `- mode: ${mode}`,
  `- generatedAt: ${new Date().toISOString()}`,
  '',
  ...changelogSections,
].join('\n');

writeFileSync(join(REPORT_DIR, 'release-gate-changelog.md'), `${changelogMarkdown}\n`, 'utf8');

const decisionPayload = {
  decision: releaseDecision,
  policy,
  mode,
  blockingAgents: config.blockingAgents,
  advisoryAgents: config.advisoryAgents,
  missingBlocking,
  blockingFailures,
  generatedAt: new Date().toISOString(),
};
writeFileSync(join(REPORT_DIR, 'release-decision.json'), `${JSON.stringify(decisionPayload, null, 2)}\n`, 'utf8');

const details = [
  `policy: ${policy}`,
  `policy description: ${config.description}`,
  `release decision: ${releaseDecision}`,
  `blocking agents: ${config.blockingAgents.join(', ') || 'none'}`,
  `advisory agents: ${config.advisoryAgents.join(', ') || 'none'}`,
  `JSON reports discovered: ${reportFiles.length}`,
  `decision file: ${join(REPORT_DIR, 'release-decision.json')}`,
  `changelog file: ${join(REPORT_DIR, 'release-gate-changelog.md')}`,
];

if (missingBlocking.length > 0) {
  details.push(`missing blocking reports: ${missingBlocking.join(', ')}`);
}
if (blockingFailures.length > 0) {
  details.push(`blocking agent failures: ${blockingFailures.join(', ')}`);
}

const report = writeAgentReport({
  id: 'release-gate',
  title: 'Release Gate Agent Report',
  summary: 'Aggregates agent outputs, applies release policy profile, and emits machine-readable release decision artifacts.',
  checks,
  details,
  mode,
  extra: {
    policy,
    releaseDecision,
    missingBlocking,
    blockingFailures,
    blockingAgents: config.blockingAgents,
    advisoryAgents: config.advisoryAgents,
  },
});

console.log('Report written: output/agent-reports/release-gate.md');
console.log('Decision written: output/agent-reports/release-decision.json');
console.log('Changelog written: output/agent-reports/release-gate-changelog.md');
exitForStatus(report);
