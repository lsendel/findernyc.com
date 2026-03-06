import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const reportDir = 'output/agent-reports';

function runNodeScript(
  path: string,
  envOverrides: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('node', [path], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...envOverrides },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('Rollout automation scripts', () => {
  it('generates staged feature-flag rollout plan artifact', () => {
    mkdirSync(reportDir, { recursive: true });

    const result = runNodeScript('scripts/rollout/feature-rollout-plan.mjs');
    expect(result.status).toBe(0);

    const jsonPath = `${reportDir}/feature-flag-rollout-plan.json`;
    expect(existsSync(jsonPath)).toBe(true);

    const report = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
      status: string;
      extra: {
        phases: Array<{ phase: string; enabled_flags: string[] }>;
      };
    };

    expect(report.status).toBe('pass');
    expect(report.extra.phases.length).toBe(3);
    expect(report.extra.phases[0]?.phase).toBe('canary');
    expect(report.extra.phases[2]?.phase).toBe('full');
    expect(report.extra.phases[2]?.enabled_flags.length).toBeGreaterThan(0);
  });

  it('evaluates rollback guard decision from release-critical reports', () => {
    mkdirSync(reportDir, { recursive: true });

    writeFileSync(`${reportDir}/release-decision.json`, JSON.stringify({ decision: 'READY' }, null, 2));
    writeFileSync(`${reportDir}/pr-quality.json`, JSON.stringify({ status: 'pass' }, null, 2));
    writeFileSync(`${reportDir}/api-contract.json`, JSON.stringify({ status: 'pass' }, null, 2));
    writeFileSync(`${reportDir}/analytics-integrity.json`, JSON.stringify({ status: 'pass' }, null, 2));
    writeFileSync(`${reportDir}/release-gate.json`, JSON.stringify({ status: 'pass' }, null, 2));

    const result = runNodeScript('scripts/rollout/rollback-guard.mjs');
    expect(result.status).toBe(0);

    const decision = JSON.parse(readFileSync(`${reportDir}/rollback-guard-decision.json`, 'utf8')) as {
      decision: string;
      checks: Array<{ success: boolean }>;
    };

    expect(decision.decision).toBe('PROCEED');
    expect(decision.checks.every((check) => check.success)).toBe(true);
  });

  it('builds phase execution env payload when rollback guard allows progression', () => {
    mkdirSync(reportDir, { recursive: true });

    const planResult = runNodeScript('scripts/rollout/feature-rollout-plan.mjs');
    expect(planResult.status).toBe(0);

    writeFileSync(`${reportDir}/rollback-guard-decision.json`, JSON.stringify({ decision: 'PROCEED' }, null, 2));

    const result = runNodeScript('scripts/rollout/phase-execution.mjs', {
      ROLLOUT_TARGET_PHASE: 'partial',
    });
    expect(result.status).toBe(0);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-execution.json`, 'utf8')) as {
      status: string;
      extra: {
        target_phase: string;
        allowed_to_proceed: boolean;
      };
    };

    const envPath = `${reportDir}/rollout-phase-partial.env`;
    expect(existsSync(envPath)).toBe(true);
    const envText = readFileSync(envPath, 'utf8');

    expect(report.status).toBe('pass');
    expect(report.extra.target_phase).toBe('partial');
    expect(report.extra.allowed_to_proceed).toBe(true);
    expect(envText).toContain('ROLLOUT_PHASE=partial');
    expect(envText).toContain('FEATURE_FLAGS=');
  });

  it('blocks partial progression when rollback guard decision is hold', () => {
    mkdirSync(reportDir, { recursive: true });

    const planResult = runNodeScript('scripts/rollout/feature-rollout-plan.mjs');
    expect(planResult.status).toBe(0);

    writeFileSync(
      `${reportDir}/rollback-guard-decision.json`,
      JSON.stringify({ decision: 'ROLLBACK_HOLD' }, null, 2),
    );

    const result = runNodeScript('scripts/rollout/phase-execution.mjs', {
      ROLLOUT_TARGET_PHASE: 'partial',
    });
    expect(result.status).toBe(1);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-execution.json`, 'utf8')) as {
      status: string;
      extra: {
        target_phase: string;
        allowed_to_proceed: boolean;
        guard_decision: string;
      };
    };

    expect(report.status).toBe('fail');
    expect(report.extra.target_phase).toBe('partial');
    expect(report.extra.allowed_to_proceed).toBe(false);
    expect(report.extra.guard_decision).toBe('ROLLBACK_HOLD');
  });

  it('promotes canary to partial when release and KPI signals are healthy', () => {
    mkdirSync(reportDir, { recursive: true });

    expect(runNodeScript('scripts/rollout/feature-rollout-plan.mjs').status).toBe(0);
    writeFileSync(`${reportDir}/rollback-guard-decision.json`, JSON.stringify({ decision: 'PROCEED' }, null, 2));
    writeFileSync(`${reportDir}/release-decision.json`, JSON.stringify({ decision: 'READY' }, null, 2));
    writeFileSync(
      `${reportDir}/release-telemetry-kpi-snapshot.json`,
      JSON.stringify(
        {
          agentSnapshot: { fail: 0 },
          checkSnapshot: { failed: 0, passRatePercent: 100 },
        },
        null,
        2,
      ),
    );

    expect(runNodeScript('scripts/rollout/phase-execution.mjs', { ROLLOUT_TARGET_PHASE: 'canary' }).status).toBe(0);
    const result = runNodeScript('scripts/rollout/phase-promotion.mjs');
    expect(result.status).toBe(0);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-promotion.json`, 'utf8')) as {
      status: string;
      extra: {
        decision: string;
        current_phase: string;
        recommended_phase: string;
      };
    };

    const envPath = `${reportDir}/rollout-phase-partial.env`;
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain('ROLLOUT_PHASE=partial');
    expect(report.status).toBe('pass');
    expect(report.extra.current_phase).toBe('canary');
    expect(report.extra.recommended_phase).toBe('partial');
    expect(report.extra.decision).toBe('PROMOTE_TO_PARTIAL');
  });

  it('recommends rollback when partial phase fails rollback guard and release readiness', () => {
    mkdirSync(reportDir, { recursive: true });

    expect(runNodeScript('scripts/rollout/feature-rollout-plan.mjs').status).toBe(0);
    writeFileSync(`${reportDir}/rollback-guard-decision.json`, JSON.stringify({ decision: 'ROLLBACK_HOLD' }, null, 2));
    writeFileSync(`${reportDir}/release-decision.json`, JSON.stringify({ decision: 'HOLD' }, null, 2));
    writeFileSync(
      `${reportDir}/release-telemetry-kpi-snapshot.json`,
      JSON.stringify(
        {
          agentSnapshot: { fail: 2 },
          checkSnapshot: { failed: 3, passRatePercent: 94 },
        },
        null,
        2,
      ),
    );
    writeFileSync(
      `${reportDir}/rollout-phase-execution.json`,
      JSON.stringify({ extra: { target_phase: 'partial' } }, null, 2),
    );

    const result = runNodeScript('scripts/rollout/phase-promotion.mjs', {
      ROLLOUT_PROMOTION_ENFORCE_FORWARD: '1',
      ROLLOUT_PROMOTION_ENFORCE_KPI: '1',
    });
    expect(result.status).toBe(1);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-promotion.json`, 'utf8')) as {
      status: string;
      extra: {
        decision: string;
        current_phase: string;
        recommended_phase: string;
      };
    };

    const envPath = `${reportDir}/rollout-phase-canary.env`;
    expect(existsSync(envPath)).toBe(true);
    expect(readFileSync(envPath, 'utf8')).toContain('ROLLOUT_PHASE=canary');
    expect(report.status).toBe('fail');
    expect(report.extra.current_phase).toBe('partial');
    expect(report.extra.recommended_phase).toBe('canary');
    expect(report.extra.decision).toBe('ROLLBACK_TO_CANARY');
  });

  it('passes rollout phase audit when transition is one-step promote', () => {
    mkdirSync(reportDir, { recursive: true });

    expect(runNodeScript('scripts/rollout/feature-rollout-plan.mjs').status).toBe(0);
    writeFileSync(
      `${reportDir}/rollout-phase-execution.json`,
      JSON.stringify({ extra: { target_phase: 'canary' } }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify(
        {
          decision: 'PROMOTE_TO_PARTIAL',
          current_phase: 'canary',
          recommended_phase: 'partial',
          env_file: `${reportDir}/rollout-phase-partial.env`,
        },
        null,
        2,
      ),
    );
    writeFileSync(`${reportDir}/rollback-guard-decision.json`, JSON.stringify({ decision: 'PROCEED' }, null, 2));
    writeFileSync(`${reportDir}/rollout-phase-partial.env`, 'FEATURE_FLAGS=example\nROLLOUT_PHASE=partial\n');

    const result = runNodeScript('scripts/rollout/phase-audit.mjs');
    expect(result.status).toBe(0);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-audit.json`, 'utf8')) as {
      status: string;
      extra: {
        transition_type: string;
        transition_valid: boolean;
      };
    };

    expect(report.status).toBe('pass');
    expect(report.extra.transition_type).toBe('promote');
    expect(report.extra.transition_valid).toBe(true);
    expect(existsSync(`${reportDir}/rollout-phase-history.json`)).toBe(true);
    expect(existsSync(`${reportDir}/rollout-apply-next.sh`)).toBe(true);
  });

  it('fails rollout phase audit when transition skips a phase', () => {
    mkdirSync(reportDir, { recursive: true });

    expect(runNodeScript('scripts/rollout/feature-rollout-plan.mjs').status).toBe(0);
    writeFileSync(
      `${reportDir}/rollout-phase-execution.json`,
      JSON.stringify({ extra: { target_phase: 'canary' } }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify(
        {
          decision: 'PROMOTE_TO_FULL',
          current_phase: 'canary',
          recommended_phase: 'full',
          env_file: `${reportDir}/rollout-phase-full.env`,
        },
        null,
        2,
      ),
    );
    writeFileSync(`${reportDir}/rollback-guard-decision.json`, JSON.stringify({ decision: 'PROCEED' }, null, 2));
    writeFileSync(`${reportDir}/rollout-phase-full.env`, 'FEATURE_FLAGS=example\nROLLOUT_PHASE=full\n');

    const result = runNodeScript('scripts/rollout/phase-audit.mjs');
    expect(result.status).toBe(1);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-audit.json`, 'utf8')) as {
      status: string;
      extra: {
        transition_type: string;
        transition_valid: boolean;
      };
    };

    expect(report.status).toBe('fail');
    expect(report.extra.transition_type).toBe('skip_forward');
    expect(report.extra.transition_valid).toBe(false);
  });

  it('allows promotion when dwell time threshold is satisfied', () => {
    mkdirSync(reportDir, { recursive: true });

    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify(
        {
          decision: 'PROMOTE_TO_PARTIAL',
          current_phase: 'canary',
          recommended_phase: 'partial',
          env_file: `${reportDir}/rollout-phase-partial.env`,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      `${reportDir}/rollout-phase-history.json`,
      JSON.stringify(
        [
          {
            timestamp: '2026-02-27T00:00:00.000Z',
            current_phase: 'canary',
            recommended_phase: 'canary',
            decision: 'HOLD_CANARY',
          },
        ],
        null,
        2,
      ),
    );

    const result = runNodeScript('scripts/rollout/phase-dwell.mjs', {
      ROLLOUT_DWELL_ENFORCE: '1',
      ROLLOUT_MIN_DWELL_HOURS: '24',
      ROLLOUT_NOW_ISO: '2026-03-01T12:00:00.000Z',
    });
    expect(result.status).toBe(0);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-dwell.json`, 'utf8')) as {
      status: string;
      extra: {
        blocked_by_dwell: boolean;
        effective_decision: string;
        effective_recommended_phase: string;
      };
    };

    expect(report.status).toBe('pass');
    expect(report.extra.blocked_by_dwell).toBe(false);
    expect(report.extra.effective_decision).toBe('PROMOTE_TO_PARTIAL');
    expect(report.extra.effective_recommended_phase).toBe('partial');
  });

  it('blocks promotion when dwell time threshold is not satisfied', () => {
    mkdirSync(reportDir, { recursive: true });

    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify(
        {
          decision: 'PROMOTE_TO_PARTIAL',
          current_phase: 'canary',
          recommended_phase: 'partial',
          env_file: `${reportDir}/rollout-phase-partial.env`,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      `${reportDir}/rollout-phase-history.json`,
      JSON.stringify(
        [
          {
            timestamp: '2026-03-01T10:30:00.000Z',
            current_phase: 'canary',
            recommended_phase: 'canary',
            decision: 'HOLD_CANARY',
          },
        ],
        null,
        2,
      ),
    );

    const result = runNodeScript('scripts/rollout/phase-dwell.mjs', {
      ROLLOUT_DWELL_ENFORCE: '1',
      ROLLOUT_MIN_DWELL_HOURS: '24',
      ROLLOUT_NOW_ISO: '2026-03-01T12:00:00.000Z',
    });
    expect(result.status).toBe(1);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-dwell.json`, 'utf8')) as {
      status: string;
      extra: {
        blocked_by_dwell: boolean;
        effective_decision: string;
        effective_recommended_phase: string;
      };
    };

    expect(report.status).toBe('fail');
    expect(report.extra.blocked_by_dwell).toBe(true);
    expect(report.extra.effective_decision).toBe('HOLD_CANARY_DWELL');
    expect(report.extra.effective_recommended_phase).toBe('canary');
  });

  it('produces deploy action when governor signals are all green', () => {
    mkdirSync(reportDir, { recursive: true });

    expect(runNodeScript('scripts/rollout/feature-rollout-plan.mjs').status).toBe(0);
    writeFileSync(`${reportDir}/release-decision.json`, JSON.stringify({ decision: 'READY' }, null, 2));
    writeFileSync(`${reportDir}/rollback-guard-decision.json`, JSON.stringify({ decision: 'PROCEED' }, null, 2));
    writeFileSync(
      `${reportDir}/rollout-phase-audit.json`,
      JSON.stringify({ extra: { transition_valid: true } }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify(
        {
          decision: 'PROMOTE_TO_PARTIAL',
          current_phase: 'canary',
          recommended_phase: 'partial',
          env_file: `${reportDir}/rollout-phase-partial.env`,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      `${reportDir}/rollout-dwell-decision.json`,
      JSON.stringify(
        {
          blocked_by_dwell: false,
          effective_decision: 'PROMOTE_TO_PARTIAL',
          effective_recommended_phase: 'partial',
        },
        null,
        2,
      ),
    );
    writeFileSync(`${reportDir}/rollout-phase-partial.env`, 'FEATURE_FLAGS=example\nROLLOUT_PHASE=partial\n');

    const result = runNodeScript('scripts/rollout/phase-governor.mjs');
    expect(result.status).toBe(0);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-governor.json`, 'utf8')) as {
      status: string;
      extra: {
        governor_action: string;
        should_deploy: boolean;
        target_phase: string;
      };
    };

    expect(report.status).toBe('pass');
    expect(report.extra.should_deploy).toBe(true);
    expect(report.extra.target_phase).toBe('partial');
    expect(report.extra.governor_action).toBe('DEPLOY_PARTIAL');
    expect(existsSync(`${reportDir}/rollout-governor-execute.sh`)).toBe(true);
  });

  it('fails governor in enforce mode when release signal is hold', () => {
    mkdirSync(reportDir, { recursive: true });

    expect(runNodeScript('scripts/rollout/feature-rollout-plan.mjs').status).toBe(0);
    writeFileSync(`${reportDir}/release-decision.json`, JSON.stringify({ decision: 'HOLD' }, null, 2));
    writeFileSync(`${reportDir}/rollback-guard-decision.json`, JSON.stringify({ decision: 'PROCEED' }, null, 2));
    writeFileSync(
      `${reportDir}/rollout-phase-audit.json`,
      JSON.stringify({ extra: { transition_valid: true } }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify(
        {
          decision: 'PROMOTE_TO_PARTIAL',
          current_phase: 'canary',
          recommended_phase: 'partial',
          env_file: `${reportDir}/rollout-phase-partial.env`,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      `${reportDir}/rollout-dwell-decision.json`,
      JSON.stringify(
        {
          blocked_by_dwell: false,
          effective_decision: 'PROMOTE_TO_PARTIAL',
          effective_recommended_phase: 'partial',
        },
        null,
        2,
      ),
    );
    writeFileSync(`${reportDir}/rollout-phase-partial.env`, 'FEATURE_FLAGS=example\nROLLOUT_PHASE=partial\n');

    const result = runNodeScript('scripts/rollout/phase-governor.mjs', {
      ROLLOUT_GOVERNOR_ENFORCE: '1',
    });
    expect(result.status).toBe(1);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-phase-governor.json`, 'utf8')) as {
      status: string;
      extra: {
        governor_action: string;
        should_deploy: boolean;
      };
    };

    expect(report.status).toBe('fail');
    expect(report.extra.should_deploy).toBe(false);
    expect(report.extra.governor_action).toBe('HOLD_OR_ROLLBACK');
  });

  it('builds deployment manifest and handoff script when governor is deploy-ready', () => {
    mkdirSync(reportDir, { recursive: true });

    writeFileSync(`${reportDir}/rollout-phase-partial.env`, 'FEATURE_FLAGS=example\nROLLOUT_PHASE=partial\n');
    writeFileSync(`${reportDir}/rollout-governor-execute.sh`, '#!/usr/bin/env bash\necho governed deploy\n');
    writeFileSync(
      `${reportDir}/rollout-governor-decision.json`,
      JSON.stringify(
        {
          governor_action: 'DEPLOY_PARTIAL',
          should_deploy: true,
          target_phase: 'partial',
          target_env_file: `${reportDir}/rollout-phase-partial.env`,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify({ decision: 'PROMOTE_TO_PARTIAL', recommended_phase: 'partial' }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-dwell-decision.json`,
      JSON.stringify({ effective_decision: 'PROMOTE_TO_PARTIAL', effective_recommended_phase: 'partial' }, null, 2),
    );
    writeFileSync(`${reportDir}/rollout-phase-audit.json`, JSON.stringify({ extra: { transition_valid: true } }, null, 2));

    const result = runNodeScript('scripts/rollout/deployment-manifest.mjs');
    expect(result.status).toBe(0);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-deployment-manifest.json`, 'utf8')) as {
      status: string;
      extra: {
        deploy_ready: boolean;
        governor: { action: string; target_phase: string };
      };
    };

    expect(report.status).toBe('pass');
    expect(report.extra.deploy_ready).toBe(true);
    expect(report.extra.governor.action).toBe('DEPLOY_PARTIAL');
    expect(report.extra.governor.target_phase).toBe('partial');
    expect(existsSync(`${reportDir}/rollout-deploy-ready.sh`)).toBe(true);
  });

  it('fails deployment manifest in enforce mode when governor is hold action', () => {
    mkdirSync(reportDir, { recursive: true });

    writeFileSync(`${reportDir}/rollout-phase-canary.env`, 'FEATURE_FLAGS=example\nROLLOUT_PHASE=canary\n');
    writeFileSync(`${reportDir}/rollout-governor-execute.sh`, '#!/usr/bin/env bash\necho blocked\n');
    writeFileSync(
      `${reportDir}/rollout-governor-decision.json`,
      JSON.stringify(
        {
          governor_action: 'HOLD_PHASE',
          should_deploy: false,
          target_phase: 'canary',
          target_env_file: `${reportDir}/rollout-phase-canary.env`,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify({ decision: 'HOLD_CANARY', recommended_phase: 'canary' }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-dwell-decision.json`,
      JSON.stringify({ effective_decision: 'HOLD_CANARY_DWELL', effective_recommended_phase: 'canary' }, null, 2),
    );
    writeFileSync(`${reportDir}/rollout-phase-audit.json`, JSON.stringify({ extra: { transition_valid: true } }, null, 2));

    const result = runNodeScript('scripts/rollout/deployment-manifest.mjs', {
      ROLLOUT_MANIFEST_ENFORCE_DEPLOY: '1',
    });
    expect(result.status).toBe(1);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-deployment-manifest.json`, 'utf8')) as {
      status: string;
      extra: { deploy_ready: boolean; governor: { action: string } };
    };

    expect(report.status).toBe('fail');
    expect(report.extra.deploy_ready).toBe(false);
    expect(report.extra.governor.action).toBe('HOLD_PHASE');
  });

  it('creates rollback rehearsal artifacts for derived previous phase', () => {
    mkdirSync(reportDir, { recursive: true });

    expect(runNodeScript('scripts/rollout/feature-rollout-plan.mjs').status).toBe(0);
    writeFileSync(
      `${reportDir}/rollout-governor-decision.json`,
      JSON.stringify(
        {
          governor_action: 'DEPLOY_PARTIAL',
          should_deploy: true,
          target_phase: 'partial',
        },
        null,
        2,
      ),
    );

    const result = runNodeScript('scripts/rollout/rollback-rehearsal.mjs');
    expect(result.status).toBe(0);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-rollback-rehearsal.json`, 'utf8')) as {
      status: string;
      extra: {
        source_phase: string;
        rollback_phase: string;
        rollback_ready: boolean;
      };
    };

    expect(report.status).toBe('pass');
    expect(report.extra.source_phase).toBe('partial');
    expect(report.extra.rollback_phase).toBe('canary');
    expect(report.extra.rollback_ready).toBe(true);
    expect(existsSync(`${reportDir}/rollout-phase-rollback.env`)).toBe(true);
    expect(existsSync(`${reportDir}/rollout-rollback-rehearsal.sh`)).toBe(true);
  });

  it('fails rollback rehearsal in enforce mode when source phase cannot be resolved', () => {
    mkdirSync(reportDir, { recursive: true });

    expect(runNodeScript('scripts/rollout/feature-rollout-plan.mjs').status).toBe(0);
    writeFileSync(
      `${reportDir}/rollout-governor-decision.json`,
      JSON.stringify(
        {
          governor_action: 'DEPLOY_UNKNOWN',
          should_deploy: true,
          target_phase: 'unknown',
        },
        null,
        2,
      ),
    );
    writeFileSync(
      `${reportDir}/rollout-dwell-decision.json`,
      JSON.stringify({ effective_recommended_phase: 'invalid-phase' }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify({ recommended_phase: 'invalid-phase' }, null, 2),
    );

    const result = runNodeScript('scripts/rollout/rollback-rehearsal.mjs', {
      ROLLOUT_REHEARSAL_ENFORCE: '1',
    });
    expect(result.status).toBe(1);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-rollback-rehearsal.json`, 'utf8')) as {
      status: string;
      extra: {
        source_phase: string | null;
        rollback_phase: string | null;
        rollback_ready: boolean;
      };
    };

    expect(report.status).toBe('fail');
    expect(report.extra.source_phase).toBe(null);
    expect(report.extra.rollback_phase).toBe(null);
    expect(report.extra.rollback_ready).toBe(false);
  });

  it('builds rollout handoff bundle from required artifact set', () => {
    mkdirSync(reportDir, { recursive: true });

    const requiredPaths = [
      'feature-flag-rollout-plan.json',
      'rollback-guard-decision.json',
      'rollout-phase-execution.json',
      'rollout-promotion-decision.json',
      'rollout-phase-audit.json',
      'rollout-dwell-decision.json',
      'rollout-governor-decision.json',
      'rollout-deployment-manifest.json',
      'rollout-rollback-rehearsal.json',
    ];
    for (const name of requiredPaths) {
      writeFileSync(`${reportDir}/${name}`, JSON.stringify({ ok: true }, null, 2));
    }

    writeFileSync(
      `${reportDir}/rollout-governor-decision.json`,
      JSON.stringify({ governor_action: 'DEPLOY_PARTIAL', target_phase: 'partial' }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-deployment-manifest.json`,
      JSON.stringify({ deploy_ready: true, governor: { target_phase: 'partial' } }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-rollback-rehearsal.json`,
      JSON.stringify({ extra: { rollback_phase: 'canary' } }, null, 2),
    );

    const result = runNodeScript('scripts/rollout/handoff-bundle.mjs', {
      ROLLOUT_HANDOFF_ENFORCE: '1',
    });
    expect(result.status).toBe(0);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-handoff-bundle.json`, 'utf8')) as {
      status: string;
      extra: {
        completeness_percent: number;
        missing: string[];
      };
    };

    expect(report.status).toBe('pass');
    expect(report.extra.completeness_percent).toBe(100);
    expect(report.extra.missing.length).toBe(0);
  });

  it('fails cross-phase consistency in enforce mode for misaligned phase chain', () => {
    mkdirSync(reportDir, { recursive: true });

    writeFileSync(`${reportDir}/rollout-phase-partial.env`, 'FEATURE_FLAGS=a\nROLLOUT_PHASE=partial\n');
    writeFileSync(
      `${reportDir}/rollout-governor-decision.json`,
      JSON.stringify({ target_phase: 'partial', target_env_file: `${reportDir}/rollout-phase-partial.env` }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-deployment-manifest.json`,
      JSON.stringify({ governor: { target_phase: 'full' }, artifacts: { env_file: `${reportDir}/rollout-phase-partial.env` } }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-dwell-decision.json`,
      JSON.stringify({ effective_recommended_phase: 'partial' }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-promotion-decision.json`,
      JSON.stringify({ recommended_phase: 'partial' }, null, 2),
    );
    writeFileSync(
      `${reportDir}/rollout-rollback-rehearsal.json`,
      JSON.stringify({ extra: { source_phase: 'partial', rollback_phase: 'canary' } }, null, 2),
    );

    const result = runNodeScript('scripts/rollout/cross-phase-consistency.mjs', {
      ROLLOUT_CONSISTENCY_ENFORCE: '1',
    });
    expect(result.status).toBe(1);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-cross-phase-consistency.json`, 'utf8')) as {
      status: string;
      extra: {
        aligned: { phase_chain: boolean };
      };
    };

    expect(report.status).toBe('fail');
    expect(report.extra.aligned.phase_chain).toBe(false);
  });

  it('generates rollback drill matrix from rollout phases', () => {
    mkdirSync(reportDir, { recursive: true });

    expect(runNodeScript('scripts/rollout/feature-rollout-plan.mjs').status).toBe(0);
    const result = runNodeScript('scripts/rollout/rollback-drill-matrix.mjs');
    expect(result.status).toBe(0);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-rollback-drill-matrix.json`, 'utf8')) as {
      status: string;
      extra: {
        matrix: Array<{ source_phase: string; rollback_phase: string }>;
      };
    };

    expect(report.status).toBe('pass');
    expect(report.extra.matrix.length).toBe(3);
    expect(report.extra.matrix[1]?.source_phase).toBe('partial');
    expect(report.extra.matrix[1]?.rollback_phase).toBe('canary');
    expect(existsSync(`${reportDir}/rollout-rollback-drill.sh`)).toBe(true);
  });

  it('fails closeout in enforce mode when a rollout report is failing', () => {
    mkdirSync(reportDir, { recursive: true });

    writeFileSync(
      `${reportDir}/rollout-fake-fail.json`,
      JSON.stringify({ id: 'rollout-fake-fail', status: 'fail' }, null, 2),
    );

    const result = runNodeScript('scripts/rollout/program-closeout.mjs', {
      ROLLOUT_CLOSEOUT_ENFORCE: '1',
    });
    expect(result.status).toBe(1);

    const report = JSON.parse(readFileSync(`${reportDir}/rollout-program-closeout.json`, 'utf8')) as {
      status: string;
      extra: {
        rollout_failed_reports: string[];
        closeout_ready: boolean;
      };
    };

    expect(report.status).toBe('fail');
    expect(report.extra.closeout_ready).toBe(false);
    expect(report.extra.rollout_failed_reports).toContain('rollout-fake-fail');
  });
});
