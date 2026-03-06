import { statSync } from 'node:fs';
import { getMode, readText, runCommand, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const requirementMap = JSON.parse(readText('docs/agentic/requirements-map.json'));

function fromStdoutLines(stdout) {
  return stdout.split('\n').map((v) => v.trim()).filter(Boolean);
}

function fileExists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function expandDirectories(paths) {
  const expanded = [];
  for (const path of paths) {
    const normalized = path.replace(/\/$/, '');
    if (!normalized) continue;

    if (isDirectory(normalized)) {
      const found = runCommand(`find "${normalized}" -type f`);
      if (found.success && found.stdout.trim()) {
        expanded.push(...fromStdoutLines(found.stdout));
      }
      continue;
    }

    if (fileExists(normalized)) {
      expanded.push(normalized);
    }
  }
  return Array.from(new Set(expanded)).sort();
}

function filesFromStatus() {
  const status = runCommand('git status --porcelain');
  if (!status.success || !status.stdout.trim()) return [];

  const rawPaths = [];
  for (const line of status.stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const path = parts[parts.length - 1];
    if (path) rawPaths.push(path);
  }

  return expandDirectories(rawPaths);
}

function getChangedFiles() {
  const headRange = runCommand('git diff --name-only --diff-filter=ACMR HEAD~1...HEAD');
  if (headRange.success && headRange.stdout.trim()) {
    return fromStdoutLines(headRange.stdout);
  }

  const staged = runCommand('git diff --name-only --diff-filter=ACMR');
  if (staged.success && staged.stdout.trim()) {
    return fromStdoutLines(staged.stdout);
  }

  const statusFiles = filesFromStatus();
  if (statusFiles.length > 0) {
    return statusFiles;
  }

  return [];
}

function matchesAny(file, regexSources) {
  return regexSources.some((pattern) => new RegExp(pattern).test(file));
}

const changedFiles = getChangedFiles();
const changedTests = changedFiles.filter((file) => file.startsWith('tests/'));
const sourceFiles = changedFiles.filter((file) => file.startsWith('src/'));

const impacted = requirementMap
  .map((req) => {
    const matchedSource = sourceFiles.filter((file) => matchesAny(file, req.sourcePatterns));
    const matchedTests = changedTests.filter((file) => matchesAny(file, req.testPatterns));
    const knownTests = req.testPatterns.flatMap((pattern) => {
      const cmd = runCommand(`find tests -type f | rg "${pattern}"`);
      return cmd.success && cmd.stdout.trim() ? fromStdoutLines(cmd.stdout) : [];
    });

    return {
      id: req.id,
      title: req.title,
      matchedSource,
      matchedTests,
      knownTests: Array.from(new Set(knownTests)),
    };
  })
  .filter((req) => req.matchedSource.length > 0);

const checks = [
  {
    name: 'Changed Files Detected',
    success: changedFiles.length > 0,
    notes: `${changedFiles.length} files in diff scope`,
  },
  {
    name: 'Requirements Mapping Available for Source Changes',
    success: sourceFiles.length === 0 || impacted.length > 0,
    notes: sourceFiles.length > 0
      ? `${impacted.length} impacted requirements for ${sourceFiles.length} source files`
      : 'No source files changed',
  },
  {
    name: 'Mapped Requirements Have Test Anchors',
    success: impacted.every((req) => req.knownTests.length > 0),
    notes: impacted.length > 0
      ? `${impacted.filter((req) => req.knownTests.length > 0).length}/${impacted.length} impacted requirements have mapped tests`
      : 'No impacted requirements',
  },
  {
    name: 'Changed Tests Present for Source Changes',
    success: sourceFiles.length === 0 || changedTests.length > 0 || mode === 'warn',
    notes: sourceFiles.length > 0
      ? `${changedTests.length} changed test files for ${sourceFiles.length} changed source files`
      : 'No source files changed',
  },
];

const details = [];
if (impacted.length === 0) {
  details.push('No requirements impacted by current source-file changes.');
} else {
  for (const req of impacted) {
    details.push(`${req.id} (${req.title})`);
    details.push(`source: ${req.matchedSource.join(', ')}`);
    details.push(`changed-tests: ${req.matchedTests.length > 0 ? req.matchedTests.join(', ') : 'none'}`);
    details.push(`mapped-tests: ${req.knownTests.length > 0 ? req.knownTests.join(', ') : 'none'}`);
  }
}

const report = writeAgentReport({
  id: 'feature-compliance',
  title: 'Feature Compliance Agent Report',
  summary: 'Maps changed source files to numbered requirements and verifies test-anchor coverage.',
  checks,
  details,
  mode,
  extra: {
    changedFiles,
    sourceFiles,
    changedTests,
    impactedRequirements: impacted.map((i) => i.id),
  },
});

console.log('Report written: output/agent-reports/feature-compliance.md');
exitForStatus(report);
