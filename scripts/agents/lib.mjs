import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const REPORT_DIR = 'output/agent-reports';

export function getMode() {
  return process.env.AGENT_MODE === 'warn' ? 'warn' : 'block';
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function clampOutput(value, maxLen = 8000) {
  if (!value) return '';
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}\n...truncated...`;
}

export function runCommand(command, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, ...(options.env ?? {}) },
  });

  const durationMs = Date.now() - startedAt;
  const code = typeof result.status === 'number' ? result.status : 1;

  return {
    command,
    code,
    success: code === 0,
    durationMs,
    stdout: clampOutput(result.stdout ?? ''),
    stderr: clampOutput(result.stderr ?? ''),
  };
}

export function parseStringArray(source) {
  return source
    .split(',')
    .map((item) => item.trim().replace(/^['"`]/, '').replace(/['"`]$/, ''))
    .filter(Boolean);
}

export function readText(path) {
  return readFileSync(path, 'utf8');
}

function summarizeChecks(checks) {
  const failed = checks.filter((c) => !c.success).length;
  const passed = checks.length - failed;
  return { passed, failed, total: checks.length };
}

export function writeAgentReport({ id, title, summary, checks, details = [], mode = getMode(), extra = {} }) {
  ensureDir(REPORT_DIR);

  const counts = summarizeChecks(checks);
  const status = counts.failed > 0 ? (mode === 'warn' ? 'warn' : 'fail') : 'pass';

  const markdownLines = [
    `# ${title}`,
    '',
    `- Agent ID: ${id}`,
    `- Mode: ${mode}`,
    `- Status: ${status.toUpperCase()}`,
    `- Summary: ${summary}`,
    `- Checks: ${counts.passed} passed / ${counts.failed} failed / ${counts.total} total`,
    '',
    '## Check Results',
    '',
    '| Name | Result | Notes |',
    '| --- | --- | --- |',
    ...checks.map((check) => `| ${check.name} | ${check.success ? 'PASS' : 'FAIL'} | ${check.notes ?? ''} |`),
  ];

  if (details.length > 0) {
    markdownLines.push('', '## Details', '');
    for (const detail of details) {
      markdownLines.push(`- ${detail}`);
    }
  }

  const payload = {
    id,
    title,
    mode,
    status,
    summary,
    counts,
    checks,
    details,
    extra,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(join(REPORT_DIR, `${id}.md`), `${markdownLines.join('\n')}\n`, 'utf8');
  writeFileSync(join(REPORT_DIR, `${id}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return payload;
}

export function printCheckLogs(checks) {
  for (const check of checks) {
    console.log(`[${check.success ? 'PASS' : 'FAIL'}] ${check.name}: ${check.notes ?? ''}`);
    if (!check.success) {
      if (check.stdout) {
        console.log('--- stdout ---');
        console.log(check.stdout);
      }
      if (check.stderr) {
        console.log('--- stderr ---');
        console.log(check.stderr);
      }
    }
  }
}

export function exitForStatus(report) {
  if (report.status === 'fail') {
    process.exit(1);
  }
}

export function loadAgentReport(reportId) {
  const path = join(REPORT_DIR, `${reportId}.json`);
  const raw = readText(path);
  return JSON.parse(raw);
}
