import { readFileSync } from 'node:fs';

export function parseFeatureFlagKeysFromSource(source) {
  const arrayMatch = source.match(/const FEATURE_FLAG_KEYS = \[([\s\S]*?)\] as const;/m);
  if (!arrayMatch) return [];
  const keys = Array.from(arrayMatch[1].matchAll(/'([^']+)'/g)).map((match) => match[1]);
  return Array.from(new Set(keys));
}

export function loadFeatureFlagKeys(path = 'src/config/feature-flags.ts') {
  const source = readFileSync(path, 'utf8');
  return parseFeatureFlagKeysFromSource(source);
}

export function scoreFeatureRisk(flag) {
  if (flag.startsWith('ai_')) return 5;
  if (flag === 'api_webhook_access') return 5;
  if (flag.startsWith('partner_') || flag.startsWith('white_label_')) return 5;
  if (flag.includes('fraud') || flag.includes('review_authenticity')) return 4;
  if (flag.includes('notifications') || flag.includes('saved_searches')) return 3;
  if (flag.includes('availability') || flag.includes('scheduling') || flag.includes('inquiry')) return 3;
  if (flag.includes('insights') || flag.includes('dashboards') || flag.includes('experimentation')) return 2;
  return 1;
}

export function buildRolloutPhases(flags, options = {}) {
  const stableEnabled = new Set(options.stableEnabled ?? ['experimentation_framework']);
  const candidateFlags = flags.filter((flag) => !stableEnabled.has(flag));

  const sorted = [...candidateFlags].sort((a, b) => {
    const riskDelta = scoreFeatureRisk(a) - scoreFeatureRisk(b);
    if (riskDelta !== 0) return riskDelta;
    return a.localeCompare(b);
  });

  const canarySize = Math.max(1, Math.ceil(sorted.length * 0.3));
  const partialSize = Math.max(canarySize, Math.ceil(sorted.length * 0.7));

  const canaryFlags = sorted.slice(0, canarySize);
  const partialFlags = sorted.slice(0, partialSize);
  const fullFlags = sorted;

  const phases = [
    {
      phase: 'canary',
      description: 'Enable low-risk features first and monitor error budget + key conversion events.',
      enabled_flags: [...stableEnabled, ...canaryFlags],
      newly_enabled: canaryFlags,
      gate_checks: ['pr-quality', 'api-contract', 'analytics-integrity', 'rollback-guard'],
    },
    {
      phase: 'partial',
      description: 'Expand to medium-risk features after canary stability window completes.',
      enabled_flags: [...stableEnabled, ...partialFlags],
      newly_enabled: partialFlags.filter((flag) => !canaryFlags.includes(flag)),
      gate_checks: ['release-gate', 'ui-regression', 'rollback-guard'],
    },
    {
      phase: 'full',
      description: 'Enable full set after partial rollout meets KPI and reliability targets.',
      enabled_flags: [...stableEnabled, ...fullFlags],
      newly_enabled: fullFlags.filter((flag) => !partialFlags.includes(flag)),
      gate_checks: ['release-gate', 'rollback-guard'],
    },
  ];

  return {
    stable_enabled: [...stableEnabled],
    total_flags: flags.length,
    candidate_count: sorted.length,
    phases,
  };
}

function normalizeStatus(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export function evaluateRollbackGuard(input) {
  const checks = [
    {
      name: 'Release Decision Ready',
      success: normalizeStatus(input.releaseDecision?.decision) === 'ready',
      notes: `decision=${input.releaseDecision?.decision ?? 'missing'}`,
    },
    {
      name: 'PR Quality Agent Pass',
      success: normalizeStatus(input.prQuality?.status) === 'pass',
      notes: `status=${input.prQuality?.status ?? 'missing'}`,
    },
    {
      name: 'API Contract Agent Pass',
      success: normalizeStatus(input.apiContract?.status) === 'pass',
      notes: `status=${input.apiContract?.status ?? 'missing'}`,
    },
    {
      name: 'Analytics Integrity Agent Pass',
      success: normalizeStatus(input.analyticsIntegrity?.status) === 'pass',
      notes: `status=${input.analyticsIntegrity?.status ?? 'missing'}`,
    },
    {
      name: 'Release Gate Agent Pass',
      success: normalizeStatus(input.releaseGate?.status) === 'pass',
      notes: `status=${input.releaseGate?.status ?? 'missing'}`,
    },
  ];

  const failed = checks.filter((check) => !check.success).length;
  return {
    checks,
    decision: failed === 0 ? 'PROCEED' : 'ROLLBACK_HOLD',
    failed,
    passed: checks.length - failed,
    total: checks.length,
  };
}
