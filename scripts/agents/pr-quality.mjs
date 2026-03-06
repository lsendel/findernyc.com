import { exitForStatus, getMode, printCheckLogs, runCommand, writeAgentReport } from './lib.mjs';

const mode = getMode();

const commands = [
  { name: 'Build Client', command: 'npm run build:client' },
  { name: 'Typecheck', command: 'npm run typecheck' },
  { name: 'Coverage + Tests', command: 'npm run test:coverage' },
];

const checks = commands.map(({ name, command }) => {
  const result = runCommand(command);
  return {
    name,
    success: result.success,
    notes: `${command} (exit ${result.code}, ${result.durationMs}ms)`,
    command,
    code: result.code,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
  };
});

printCheckLogs(checks);

const report = writeAgentReport({
  id: 'pr-quality',
  title: 'PR Quality Agent Report',
  summary: 'Validates build, type safety, and coverage-backed test execution as a merge gate.',
  checks,
  mode,
});

console.log('Report written: output/agent-reports/pr-quality.md');
exitForStatus(report);
