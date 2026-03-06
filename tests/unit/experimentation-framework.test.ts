import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetExperimentFrameworkForTests,
  assignSearchExperiments,
  getExperimentStatusSnapshot,
  recordExperimentClickOutcomes,
  rollbackExperiment,
} from '../../src/experiments/framework';

describe('experimentation framework', () => {
  beforeEach(() => {
    __resetExperimentFrameworkForTests();
  });

  it('assigns experiments deterministically for a session and records exposures', () => {
    const first = assignSearchExperiments({
      session_id: 'sess_framework_1',
      enabled: true,
    });
    const second = assignSearchExperiments({
      session_id: 'sess_framework_1',
      enabled: true,
    });

    expect(first.length).toBeGreaterThanOrEqual(2);
    expect(second.length).toBeGreaterThanOrEqual(2);
    expect(first.map((item) => item.variant)).toEqual(second.map((item) => item.variant));

    const snapshots = getExperimentStatusSnapshot();
    const withExposure = snapshots.filter((item) => item.metrics.control.exposures + item.metrics.treatment.exposures > 0);
    expect(withExposure.length).toBeGreaterThanOrEqual(2);
  });

  it('tracks click outcomes and updates ctr metrics', () => {
    assignSearchExperiments({
      session_id: 'sess_framework_ctr',
      enabled: true,
    });
    recordExperimentClickOutcomes(['ranking_blend_v1:treatment', 'trust_controls_v1:control']);

    const snapshots = getExperimentStatusSnapshot();
    const ranking = snapshots.find((item) => item.id === 'ranking_blend_v1');
    const trust = snapshots.find((item) => item.id === 'trust_controls_v1');
    expect((ranking?.metrics.control.clicks ?? 0) + (ranking?.metrics.treatment.clicks ?? 0)).toBeGreaterThan(0);
    expect((trust?.metrics.control.clicks ?? 0) + (trust?.metrics.treatment.clicks ?? 0)).toBeGreaterThan(0);
  });

  it('rolls back experiment to forced control variant', () => {
    const rollback = rollbackExperiment({
      experiment_id: 'ranking_blend_v1',
      reason: 'manual stop-loss trigger',
    });
    expect(rollback.success).toBe(true);
    expect(rollback.experiment?.status).toBe('rolled_back');
    expect(rollback.experiment?.settings.forced_variant).toBe('control');
  });
});
