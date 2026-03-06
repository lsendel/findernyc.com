import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPORT_DIR, getMode, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const dashboardMdPath = join(REPORT_DIR, 'release-telemetry-kpi-snapshot.md');
const dashboardJsonPath = join(REPORT_DIR, 'release-telemetry-kpi-snapshot.json');

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const reportFiles = existsSync(REPORT_DIR)
  ? readdirSync(REPORT_DIR).filter((name) => name.endsWith('.json') && name !== 'release-decision.json')
  : [];
const reports = reportFiles
  .map((name) => readJson(join(REPORT_DIR, name)))
  .filter(Boolean);
const releaseDecision = readJson(join(REPORT_DIR, 'release-decision.json'));
const metricsSummary = readJson(join(REPORT_DIR, 'agent-metrics.json'));
const searchCalibration = readJson(join(REPORT_DIR, 'search-calibration-recommendations.json'));
const neighborhoodCalibration = readJson(join(REPORT_DIR, 'neighborhood-fit-calibration-recommendations.json'));

const agentsPass = reports.filter((report) => report.status === 'pass').length;
const agentsWarn = reports.filter((report) => report.status === 'warn').length;
const agentsFail = reports.filter((report) => report.status === 'fail').length;
const checksTotal = reports.reduce((sum, report) => sum + Number(report.counts?.total ?? 0), 0);
const checksFailed = reports.reduce((sum, report) => sum + Number(report.counts?.failed ?? 0), 0);
const checksPassed = reports.reduce((sum, report) => sum + Number(report.counts?.passed ?? 0), 0);
const checkPassRate = checksTotal > 0 ? Number(((checksPassed / checksTotal) * 100).toFixed(1)) : 0;

const failingChecks = reports.flatMap((report) => (report.checks ?? [])
  .filter((check) => !check.success)
  .map((check) => ({
    agent: report.id,
    name: check.name,
    notes: check.notes ?? '',
  })));

const topFailingChecks = failingChecks.slice(0, 5);
const searchActions = Array.isArray(searchCalibration?.queryRecommendations)
  ? searchCalibration.queryRecommendations.length
  : 0;
const neighborhoodActions = Array.isArray(neighborhoodCalibration?.actions)
  ? neighborhoodCalibration.actions.length
  : 0;

const dashboard = {
  generatedAt: new Date().toISOString(),
  releaseDecision: releaseDecision?.decision ?? 'UNKNOWN',
  releasePolicy: releaseDecision?.policy ?? 'unknown',
  agentSnapshot: {
    total: reports.length,
    pass: agentsPass,
    warn: agentsWarn,
    fail: agentsFail,
  },
  checkSnapshot: {
    total: checksTotal,
    passed: checksPassed,
    failed: checksFailed,
    passRatePercent: checkPassRate,
  },
  calibrationSnapshot: {
    searchRecommendations: searchActions,
    neighborhoodActions,
  },
  topFailingChecks,
  metricsSummaryPresent: Boolean(metricsSummary),
};

const dashboardMd = [
  '# Weekly Release Telemetry Dashboard',
  '',
  `- Generated: ${dashboard.generatedAt}`,
  `- Release decision: ${dashboard.releaseDecision} (${dashboard.releasePolicy})`,
  '',
  '## Agent Snapshot',
  '',
  `- Total agents: ${dashboard.agentSnapshot.total}`,
  `- PASS: ${dashboard.agentSnapshot.pass}`,
  `- WARN: ${dashboard.agentSnapshot.warn}`,
  `- FAIL: ${dashboard.agentSnapshot.fail}`,
  '',
  '## Check Snapshot',
  '',
  `- Total checks: ${dashboard.checkSnapshot.total}`,
  `- Passed: ${dashboard.checkSnapshot.passed}`,
  `- Failed: ${dashboard.checkSnapshot.failed}`,
  `- Pass rate: ${dashboard.checkSnapshot.passRatePercent}%`,
  '',
  '## Calibration Snapshot',
  '',
  `- Search recommendations: ${dashboard.calibrationSnapshot.searchRecommendations}`,
  `- Neighborhood-fit actions: ${dashboard.calibrationSnapshot.neighborhoodActions}`,
  '',
  '## Top Failing Checks',
  '',
  ...(dashboard.topFailingChecks.length === 0
    ? ['- None']
    : dashboard.topFailingChecks.map((item) => `- [${item.agent}] ${item.name}: ${item.notes}`)),
].join('\n');

writeFileSync(dashboardMdPath, `${dashboardMd}\n`, 'utf8');
writeFileSync(dashboardJsonPath, `${JSON.stringify(dashboard, null, 2)}\n`, 'utf8');

const checks = [
  {
    name: 'Release Decision Artifact Available',
    success: Boolean(releaseDecision?.decision),
    notes: releaseDecision?.decision
      ? `decision=${releaseDecision.decision} policy=${releaseDecision.policy}`
      : 'release-decision.json missing',
  },
  {
    name: 'Metrics Summary Artifact Available',
    success: Boolean(metricsSummary),
    notes: metricsSummary ? 'agent-metrics.json present' : 'agent-metrics.json missing',
  },
  {
    name: 'Calibration Recommendation Artifacts Available',
    success: Boolean(searchCalibration) && Boolean(neighborhoodCalibration),
    notes: `search=${Boolean(searchCalibration)} neighborhood=${Boolean(neighborhoodCalibration)}`,
  },
];

const details = [
  `dashboard markdown: ${dashboardMdPath}`,
  `dashboard json: ${dashboardJsonPath}`,
  `agents total/pass/warn/fail: ${agentsPass + agentsWarn + agentsFail}/${agentsPass}/${agentsWarn}/${agentsFail}`,
  `checks total/passed/failed: ${checksTotal}/${checksPassed}/${checksFailed}`,
  `check pass rate: ${checkPassRate}%`,
  `top failing checks captured: ${topFailingChecks.length}`,
];

const report = writeAgentReport({
  id: 'release-telemetry-dashboard',
  title: 'Release Telemetry Dashboard Agent Report',
  summary: 'Builds weekly KPI snapshots for release readiness and calibration health.',
  checks,
  details,
  mode,
  extra: dashboard,
});

console.log('Report written: output/agent-reports/release-telemetry-dashboard.md');
console.log('Dashboard written: output/agent-reports/release-telemetry-kpi-snapshot.md');
exitForStatus(report);
