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

export function runProcess(command, args = [], options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    shell: false,
    encoding: 'utf8',
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, ...(options.env ?? {}) },
  });

  const durationMs = Date.now() - startedAt;
  const code = typeof result.status === 'number' ? result.status : 1;

  return {
    command: [command, ...args].join(' '),
    code,
    success: code === 0,
    durationMs,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

export function getRuntimeD1Config() {
  const override = process.env.D1_REMOTE_ACCESS;
  const enabled = override === '0'
    ? false
    : override === '1'
      ? true
      : Boolean(process.env.CLOUDFLARE_API_TOKEN);

  return {
    binding: process.env.D1_BINDING ?? 'DB',
    enabled,
    preview: process.env.D1_PREVIEW === '1',
  };
}

export function queryRuntimeD1Rows(command, options = {}) {
  const config = {
    ...getRuntimeD1Config(),
    ...options,
  };

  if (!config.enabled) {
    return {
      enabled: false,
      connected: false,
      rows: [],
      meta: null,
      error: null,
    };
  }

  const args = [
    'wrangler',
    'd1',
    'execute',
    config.binding,
    '--remote',
    '--json',
    '--command',
    command,
  ];

  if (config.preview) {
    args.push('--preview');
  }

  const result = runProcess('npx', args, options);
  if (!result.success) {
    return {
      enabled: true,
      connected: false,
      rows: [],
      meta: null,
      error: result.stderr || result.stdout || `wrangler d1 execute failed with exit code ${result.code}`,
    };
  }

  try {
    const parsed = JSON.parse(result.stdout);
    const statement = Array.isArray(parsed) ? parsed[0] : parsed;

    if (!statement?.success) {
      return {
        enabled: true,
        connected: false,
        rows: [],
        meta: statement?.meta ?? null,
        error: statement?.error ?? 'wrangler d1 execute returned an unsuccessful response',
      };
    }

    return {
      enabled: true,
      connected: true,
      rows: Array.isArray(statement.results) ? statement.results : [],
      meta: statement.meta ?? null,
      error: null,
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      rows: [],
      meta: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
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
