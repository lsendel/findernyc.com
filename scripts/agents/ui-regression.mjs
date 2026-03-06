import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getMode, runCommand, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:8788';
const updateBaseline = process.env.UPDATE_BASELINE === '1';

const baselineDir = 'tests/visual/baseline';
const currentDir = 'output/playwright/current';

const routes = [
  { id: 'home', path: '/' },
  { id: 'contact', path: '/contact' },
  { id: 'blog-guide', path: '/blog/local-event-discovery-guide' },
];

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function hashFile(path) {
  const content = readFileSync(path);
  return createHash('sha256').update(content).digest('hex');
}

function resolveCliCommand() {
  if (process.env.PLAYWRIGHT_CLI_CMD) return process.env.PLAYWRIGHT_CLI_CMD;

  const codexHome = process.env.CODEX_HOME ?? `${process.env.HOME}/.codex`;
  const wrapper = `${codexHome}/skills/playwright/scripts/playwright_cli.sh`;

  if (existsSync(wrapper)) {
    return `"${wrapper}"`;
  }

  return 'npx --yes --package @playwright/cli playwright-cli';
}

async function run() {
  ensureDir(baselineDir);
  ensureDir(currentDir);

  const cli = resolveCliCommand();

  const health = runCommand(`curl -fsS "${baseUrl}" >/dev/null`);

  const captureResults = [];

  for (const route of routes) {
    const screenshotFile = join(currentDir, `${route.id}.png`);
    const url = `${baseUrl}${route.path}`;

    const open = runCommand(`${cli} open "${url}"`);
    const screenshot = open.success
      ? runCommand(`${cli} screenshot --full-page --filename "${screenshotFile}"`)
      : { success: false, code: 1, stdout: '', stderr: 'open failed' };
    const close = runCommand(`${cli} close`);

    captureResults.push({
      route,
      url,
      file: screenshotFile,
      open,
      screenshot,
      close,
    });
  }

  const missingCurrent = captureResults.filter((entry) => !existsSync(entry.file)).map((entry) => entry.route.id);

  const baselineMissing = [];
  const mismatches = [];

  for (const route of routes) {
    const baseline = join(baselineDir, `${route.id}.png`);
    const current = join(currentDir, `${route.id}.png`);

    if (!existsSync(current)) continue;

    if (updateBaseline || !existsSync(baseline)) {
      copyFileSync(current, baseline);
      if (!updateBaseline) baselineMissing.push(route.id);
      continue;
    }

    const baselineHash = hashFile(baseline);
    const currentHash = hashFile(current);

    if (baselineHash !== currentHash) {
      mismatches.push(route.id);
    }
  }

  const a11yRun = runCommand('npx vitest run tests/a11y/axe.test.ts');

  const checks = [
    {
      name: 'Local UI Endpoint Reachable',
      success: health.success,
      notes: `${baseUrl} reachable=${health.success}`,
      stdout: health.stdout,
      stderr: health.stderr,
    },
    {
      name: 'Playwright Captured All Required Routes',
      success: captureResults.every((entry) => entry.open.success && entry.screenshot.success) && missingCurrent.length === 0,
      notes: missingCurrent.length === 0
        ? `${captureResults.length} screenshots captured`
        : `missing screenshots for: ${missingCurrent.join(', ')}`,
      stdout: captureResults.map((entry) => `${entry.route.id}: open=${entry.open.code ?? 1} screenshot=${entry.screenshot.code ?? 1}`).join('\n'),
      stderr: captureResults.map((entry) => `${entry.route.id}: ${entry.screenshot.stderr ?? ''}`).join('\n'),
    },
    {
      name: 'Visual Baseline Comparison',
      success: (baselineMissing.length === 0 || updateBaseline || mode === 'warn') && mismatches.length === 0,
      notes: updateBaseline
        ? 'baseline updated from current screenshots'
        : baselineMissing.length > 0
          ? `baseline missing for: ${baselineMissing.join(', ')}`
          : mismatches.length > 0
            ? `mismatched routes: ${mismatches.join(', ')}`
            : 'all screenshots match baseline',
    },
    {
      name: 'A11y Focused Test Summary',
      success: a11yRun.success,
      notes: `vitest a11y (exit ${a11yRun.code})`,
      stdout: a11yRun.stdout,
      stderr: a11yRun.stderr,
    },
  ];

  const details = [
    `base URL: ${baseUrl}`,
    `playwright CLI command: ${cli}`,
    `update baseline mode: ${updateBaseline}`,
    `current screenshots: ${captureResults.map((entry) => entry.file).join(', ')}`,
  ];

  if (baselineMissing.length > 0) {
    details.push(`missing baseline files: ${baselineMissing.join(', ')}`);
  }
  if (mismatches.length > 0) {
    details.push(`visual mismatches: ${mismatches.join(', ')}`);
  }

  const report = writeAgentReport({
    id: 'ui-regression',
    title: 'UI Regression Agent Report',
    summary: 'Captures critical-route screenshots via Playwright CLI, compares against visual baselines, and includes a11y test status.',
    checks,
    details,
    mode,
    extra: {
      baseUrl,
      routes,
      baselineDir,
      currentDir,
      updateBaseline,
      baselineMissing,
      mismatches,
    },
  });

  console.log('Report written: output/agent-reports/ui-regression.md');
  exitForStatus(report);
}

run();
