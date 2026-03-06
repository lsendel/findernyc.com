import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPORT_DIR, writeAgentReport, getMode, exitForStatus } from './lib.mjs';

const mode = getMode();
const metricsLogPath = 'docs/agentic/metrics-log.csv';

function parseCsv(content) {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const record = {};
    for (let i = 0; i < headers.length; i += 1) {
      record[headers[i]] = cols[i] ?? '';
    }
    return record;
  });
}

function toInt(value) {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : Math.trunc(num);
}

function avg(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const reportFiles = existsSync(REPORT_DIR)
  ? readdirSync(REPORT_DIR)
    .filter((name) => name.endsWith('.json') && !['release-decision.json'].includes(name))
    .map((name) => join(REPORT_DIR, name))
  : [];

const reportDocs = reportFiles.map((path) => {
  try {
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    return doc;
  } catch {
    return null;
  }
}).filter(Boolean);

const reportById = Object.fromEntries(reportDocs.map((doc) => [doc.id, doc]));

const perAgent = reportDocs.map((doc) => ({
  id: doc.id,
  status: doc.status,
  checksTotal: toInt(doc.counts?.total),
  checksPassed: toInt(doc.counts?.passed),
  checksFailed: toInt(doc.counts?.failed),
}));

const totalChecks = perAgent.reduce((sum, item) => sum + item.checksTotal, 0);
const totalFailed = perAgent.reduce((sum, item) => sum + item.checksFailed, 0);
const totalPassed = perAgent.reduce((sum, item) => sum + item.checksPassed, 0);
const failingAgents = perAgent.filter((item) => item.status === 'fail').map((item) => item.id);

const releaseDecisionPath = join(REPORT_DIR, 'release-decision.json');
const releaseDecision = existsSync(releaseDecisionPath)
  ? JSON.parse(readFileSync(releaseDecisionPath, 'utf8'))
  : { decision: 'UNKNOWN', policy: 'unknown' };

const csvRows = existsSync(metricsLogPath)
  ? parseCsv(readFileSync(metricsLogPath, 'utf8'))
  : [];

const last90DaysRows = csvRows.filter((row) => {
  if (!row.date) return false;
  const date = new Date(`${row.date}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 90);
  return date >= cutoff;
});

const fpValues = last90DaysRows.map((row) => toInt(row.false_positive_count));
const fnValues = last90DaysRows.map((row) => toInt(row.false_negative_count));
const mttrValues = last90DaysRows
  .map((row) => Number(row.mttr_minutes))
  .filter((value) => Number.isFinite(value) && value > 0);

const fpTotal = fpValues.reduce((a, b) => a + b, 0);
const fnTotal = fnValues.reduce((a, b) => a + b, 0);
const mttrAvg = avg(mttrValues);

const suggestedActions = [];
if (fpTotal > 5) suggestedActions.push('Reduce false positives by relaxing noisy checks or improving signal quality.');
if (fnTotal > 0) suggestedActions.push('Investigate false negatives and add missing checks/test coverage.');
if (mttrAvg > 180) suggestedActions.push('Improve runbook triage flow to reduce MTTR above 180 minutes.');
if (suggestedActions.length === 0) {
  suggestedActions.push('Current signal quality is stable; keep thresholds unchanged this cycle.');
}

const checks = [
  {
    name: 'Agent Reports Available for Metrics',
    success: reportDocs.length > 0,
    notes: `${reportDocs.length} report JSON files parsed`,
  },
  {
    name: 'Release Decision Artifact Available',
    success: releaseDecision.decision && releaseDecision.decision !== 'UNKNOWN',
    notes: `decision=${releaseDecision.decision} policy=${releaseDecision.policy}`,
  },
  {
    name: 'Metrics Log Present for Noise Tracking',
    success: existsSync(metricsLogPath),
    notes: existsSync(metricsLogPath)
      ? `${csvRows.length} historical entries (${last90DaysRows.length} in last 90 days)`
      : 'metrics-log.csv missing',
  },
];

const details = [
  `total checks: ${totalChecks}`,
  `checks passed: ${totalPassed}`,
  `checks failed: ${totalFailed}`,
  `failing agents: ${failingAgents.length > 0 ? failingAgents.join(', ') : 'none'}`,
  `false positives (90d): ${fpTotal}`,
  `false negatives (90d): ${fnTotal}`,
  `avg MTTR minutes (90d): ${mttrAvg.toFixed(1)}`,
  `suggested actions: ${suggestedActions.join(' | ')}`,
];

const metricsPayload = {
  generatedAt: new Date().toISOString(),
  mode,
  releaseDecision,
  perAgent,
  totals: {
    totalChecks,
    totalPassed,
    totalFailed,
  },
  noise: {
    falsePositives90d: fpTotal,
    falseNegatives90d: fnTotal,
    avgMttrMinutes90d: Number(mttrAvg.toFixed(1)),
    dataPoints90d: last90DaysRows.length,
  },
  suggestedActions,
};

writeFileSync(join(REPORT_DIR, 'agent-metrics.json'), `${JSON.stringify(metricsPayload, null, 2)}\n`, 'utf8');

const metricsMd = [
  '# Agent Metrics Summary',
  '',
  `- generatedAt: ${metricsPayload.generatedAt}`,
  `- release decision: ${releaseDecision.decision} (${releaseDecision.policy})`,
  `- total checks: ${totalChecks}`,
  `- total failed checks: ${totalFailed}`,
  '',
  '## Per-Agent',
  '',
  '| Agent | Status | Passed | Failed | Total |',
  '| --- | --- | --- | --- | --- |',
  ...perAgent.map((item) => `| ${item.id} | ${item.status} | ${item.checksPassed} | ${item.checksFailed} | ${item.checksTotal} |`),
  '',
  '## Noise and Resolution (Last 90 Days)',
  '',
  `- false positives: ${fpTotal}`,
  `- false negatives: ${fnTotal}`,
  `- avg MTTR (minutes): ${mttrAvg.toFixed(1)}`,
  '',
  '## Suggested Actions',
  '',
  ...suggestedActions.map((item) => `- ${item}`),
].join('\n');

writeFileSync(join(REPORT_DIR, 'agent-metrics.md'), `${metricsMd}\n`, 'utf8');

const report = writeAgentReport({
  id: 'metrics-summary',
  title: 'Metrics Summary Agent Report',
  summary: 'Aggregates agent results, release decision, and noise/MTTR tracking data for threshold calibration.',
  checks,
  details,
  mode,
  extra: metricsPayload,
});

console.log('Report written: output/agent-reports/metrics-summary.md');
console.log('Metrics written: output/agent-reports/agent-metrics.json');
console.log('Metrics markdown: output/agent-reports/agent-metrics.md');
exitForStatus(report);
