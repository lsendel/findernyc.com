import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const enforceAllRolloutPass = process.env.ROLLOUT_CLOSEOUT_ENFORCE === '1';
const trackerPath = 'docs/execution/30-feature-rollout.md';

const reportFiles = existsSync(REPORT_DIR)
  ? readdirSync(REPORT_DIR).filter((name) => name.startsWith('rollout-') && name.endsWith('.json'))
  : [];

const reports = reportFiles
  .map((name) => readJsonOrNull(join(REPORT_DIR, name)))
  .filter(Boolean)
  .filter((doc) => typeof doc.id === 'string' && typeof doc.status === 'string');

const failedRolloutReports = reports.filter((report) => report.status === 'fail').map((report) => report.id);
const warnRolloutReports = reports.filter((report) => report.status === 'warn').map((report) => report.id);

const trackerText = existsSync(trackerPath) ? readFileSync(trackerPath, 'utf8') : '';
const completedWeeks = Array.from(trackerText.matchAll(/## Week (\d+) Status \(Started\)[\s\S]*?(?=## Week \d+ Status|## 30 Feature Flags|$)/g))
  .filter((match) => /\-\s\[x\]/.test(match[0]))
  .map((match) => Number(match[1]));

const highestCompletedWeek = completedWeeks.length > 0 ? Math.max(...completedWeeks) : 0;
const closeoutReady = failedRolloutReports.length === 0;

const checks = [
  {
    name: 'Rollout Reports Available For Closeout',
    success: reports.length > 0,
    notes: `reports=${reports.length}`,
  },
  {
    name: 'No Failing Rollout Reports',
    success: !enforceAllRolloutPass || closeoutReady,
    notes: `failed=${failedRolloutReports.length} enforce=${enforceAllRolloutPass}`,
  },
  {
    name: 'Tracker Includes Completed Weekly Entries',
    success: completedWeeks.length > 0,
    notes: `completedWeeks=${completedWeeks.length} highestWeek=${highestCompletedWeek}`,
  },
];

const payload = {
  generatedAt: new Date().toISOString(),
  enforce_all_rollout_pass: enforceAllRolloutPass,
  rollout_reports_total: reports.length,
  rollout_failed_reports: failedRolloutReports,
  rollout_warn_reports: warnRolloutReports,
  tracker_completed_weeks: completedWeeks,
  highest_completed_week: highestCompletedWeek,
  closeout_ready: closeoutReady,
};

ensureDir(REPORT_DIR);
writeFileSync(join(REPORT_DIR, 'rollout-program-closeout.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const details = [
  `rollout reports total: ${reports.length}`,
  `failed rollout reports: ${failedRolloutReports.length > 0 ? failedRolloutReports.join(', ') : 'none'}`,
  `warn rollout reports: ${warnRolloutReports.length > 0 ? warnRolloutReports.join(', ') : 'none'}`,
  `highest completed week: ${highestCompletedWeek}`,
  `closeout ready: ${closeoutReady}`,
];

const report = writeAgentReport({
  id: 'rollout-program-closeout',
  title: 'Rollout Program Closeout Agent Report',
  summary: 'Aggregates rollout report health and tracker completion state into a final closeout readiness signal.',
  checks,
  details,
  mode,
  extra: payload,
});

const markdown = [
  '# Rollout Program Closeout',
  '',
  `- Generated At: ${payload.generatedAt}`,
  `- Rollout Reports: ${reports.length}`,
  `- Failed Reports: ${failedRolloutReports.length}`,
  `- Warn Reports: ${warnRolloutReports.length}`,
  `- Highest Completed Week: ${highestCompletedWeek}`,
  `- Closeout Ready: ${closeoutReady ? 'yes' : 'no'}`,
  '',
];
writeFileSync(join(REPORT_DIR, 'rollout-program-closeout.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log('Report written: output/agent-reports/rollout-program-closeout.md');
exitForStatus(report);
