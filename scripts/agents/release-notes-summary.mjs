import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPORT_DIR, getMode, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const notesMdPath = join(REPORT_DIR, 'release-notes.md');
const notesJsonPath = join(REPORT_DIR, 'release-notes.json');

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const releaseDecision = readJson(join(REPORT_DIR, 'release-decision.json'));
const reportFiles = existsSync(REPORT_DIR)
  ? readdirSync(REPORT_DIR).filter((name) => name.endsWith('.json') && !name.startsWith('release-notes-summary'))
  : [];
const reports = reportFiles
  .map((name) => readJson(join(REPORT_DIR, name)))
  .filter((report) => report && report.id);

const releaseGate = reports.find((report) => report.id === 'release-gate');
const prQuality = reports.find((report) => report.id === 'pr-quality');
const searchCalibration = readJson(join(REPORT_DIR, 'search-calibration-recommendations.json'));
const neighborhoodCalibration = readJson(join(REPORT_DIR, 'neighborhood-fit-calibration-recommendations.json'));

const failingAgents = reports.filter((report) => report.status === 'fail').map((report) => report.id);
const warningAgents = reports.filter((report) => report.status === 'warn').map((report) => report.id);

const failingChecks = reports.flatMap((report) => (report.checks ?? [])
  .filter((check) => !check.success)
  .map((check) => ({
    agent: report.id,
    name: check.name,
    notes: check.notes ?? '',
  })));

const highlights = [
  `Release decision: ${releaseDecision?.decision ?? 'UNKNOWN'} (${releaseDecision?.policy ?? 'unknown'})`,
  `Agent status: ${reports.length - failingAgents.length - warningAgents.length} pass / ${warningAgents.length} warn / ${failingAgents.length} fail`,
  `Quality checks: ${prQuality?.counts?.passed ?? 0}/${prQuality?.counts?.total ?? 0} passed (pr-quality)`,
];

const calibrationActions = [
  ...(Array.isArray(searchCalibration?.queryRecommendations)
    ? [`Search query recommendations: ${searchCalibration.queryRecommendations.length}`]
    : []),
  ...(Array.isArray(searchCalibration?.eventBoostCandidates)
    ? [`Search event-boost candidates: ${searchCalibration.eventBoostCandidates.length}`]
    : []),
  ...(Array.isArray(neighborhoodCalibration?.actions)
    ? [`Neighborhood-fit actions: ${neighborhoodCalibration.actions.join(' | ')}`]
    : []),
];

const followUps = [
  ...(failingChecks.length > 0
    ? failingChecks.slice(0, 5).map((item) => `[${item.agent}] ${item.name}: ${item.notes}`)
    : ['No failing checks reported in current artifact set.']),
];

const notesPayload = {
  generatedAt: new Date().toISOString(),
  releaseDecision: releaseDecision?.decision ?? 'UNKNOWN',
  releasePolicy: releaseDecision?.policy ?? 'unknown',
  highlights,
  calibrationActions,
  followUps,
  failingAgents,
  warningAgents,
  releaseGateStatus: releaseGate?.status ?? 'unknown',
};

const notesMarkdown = [
  '# Automated Release Notes Summary',
  '',
  `- Generated: ${notesPayload.generatedAt}`,
  '',
  '## Highlights',
  '',
  ...highlights.map((item) => `- ${item}`),
  '',
  '## Calibration Updates',
  '',
  ...(calibrationActions.length > 0
    ? calibrationActions.map((item) => `- ${item}`)
    : ['- No calibration artifacts were available for this run.']),
  '',
  '## Follow-ups',
  '',
  ...followUps.map((item) => `- ${item}`),
].join('\n');

writeFileSync(notesMdPath, `${notesMarkdown}\n`, 'utf8');
writeFileSync(notesJsonPath, `${JSON.stringify(notesPayload, null, 2)}\n`, 'utf8');

const checks = [
  {
    name: 'Release Decision Artifact Available',
    success: Boolean(releaseDecision?.decision),
    notes: releaseDecision?.decision
      ? `decision=${releaseDecision.decision} policy=${releaseDecision.policy}`
      : 'release-decision.json missing',
  },
  {
    name: 'Agent Reports Available for Summary',
    success: reports.length > 0,
    notes: `${reports.length} report artifacts parsed`,
  },
  {
    name: 'Release Notes Artifact Generated',
    success: existsSync(notesMdPath) && existsSync(notesJsonPath),
    notes: `markdown=${existsSync(notesMdPath)} json=${existsSync(notesJsonPath)}`,
  },
];

const details = [
  `notes markdown: ${notesMdPath}`,
  `notes json: ${notesJsonPath}`,
  `release gate status: ${notesPayload.releaseGateStatus}`,
  `failing agents: ${failingAgents.length > 0 ? failingAgents.join(', ') : 'none'}`,
  `warning agents: ${warningAgents.length > 0 ? warningAgents.join(', ') : 'none'}`,
];

const report = writeAgentReport({
  id: 'release-notes-summary',
  title: 'Release Notes Summary Agent Report',
  summary: 'Generates automated release-note summaries from CI artifacts and calibration outputs.',
  checks,
  details,
  mode,
  extra: notesPayload,
});

console.log('Report written: output/agent-reports/release-notes-summary.md');
console.log('Release notes written: output/agent-reports/release-notes.md');
exitForStatus(report);
