import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/index';
import { __resetExperimentFrameworkForTests } from '../../src/experiments/framework';

describe('Experimentation APIs', () => {
  beforeEach(() => {
    __resetExperimentFrameworkForTests();
  });

  it('returns 503 when experimentation framework is disabled', async () => {
    const statusRes = await app.request(
      '/api/experiments/status',
      undefined,
      { FEATURE_FLAGS: '-experimentation_framework' },
    );
    expect(statusRes.status).toBe(503);

    const rollbackRes = await app.request(
      '/api/experiments/ranking_blend_v1/rollback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'test' }),
      },
      { FEATURE_FLAGS: '-experimentation_framework' },
    );
    expect(rollbackRes.status).toBe(503);
  });

  it('reports experiment status and guardrail sample counts after traffic', async () => {
    for (let i = 0; i < 8; i += 1) {
      await app.request(
        '/api/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'events',
            session_id: `sess_exp_status_${i}`,
            limit: 6,
          }),
        },
        { FEATURE_FLAGS: 'unified_smart_search,experimentation_framework' },
      );
    }

    const res = await app.request(
      '/api/experiments/status',
      undefined,
      { FEATURE_FLAGS: 'experimentation_framework' },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: true;
      items: Array<{
        id: string;
        metrics: {
          control: { exposures: number };
          treatment: { exposures: number };
        };
        guardrail: {
          status: 'insufficient_sample' | 'healthy' | 'stop_loss_triggered';
        };
      }>;
    };
    expect(json.items.length).toBeGreaterThanOrEqual(2);
    expect(json.items.some((item) => item.metrics.control.exposures > 0)).toBe(true);
    expect(json.items.some((item) => item.metrics.treatment.exposures > 0)).toBe(true);
    expect(json.items.every((item) => item.guardrail.status === 'insufficient_sample' || item.guardrail.status === 'healthy' || item.guardrail.status === 'stop_loss_triggered')).toBe(true);
  });

  it('rolls back an experiment through rollback hook', async () => {
    const rollbackRes = await app.request(
      '/api/experiments/ranking_blend_v1/rollback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'stop-loss smoke test' }),
      },
      { FEATURE_FLAGS: 'experimentation_framework' },
    );
    expect(rollbackRes.status).toBe(200);
    const rollbackJson = await rollbackRes.json() as {
      success: true;
      item: { id: string; status: string; settings?: { forced_variant?: string } };
      reason?: string;
    };
    expect(rollbackJson.item.id).toBe('ranking_blend_v1');
    expect(rollbackJson.item.status).toBe('rolled_back');

    const statusRes = await app.request(
      '/api/experiments/status',
      undefined,
      { FEATURE_FLAGS: 'experimentation_framework' },
    );
    const statusJson = await statusRes.json() as {
      success: true;
      items: Array<{ id: string; status: string; settings: { forced_variant?: string } }>;
    };
    const target = statusJson.items.find((item) => item.id === 'ranking_blend_v1');
    expect(target?.status).toBe('rolled_back');
    expect(target?.settings.forced_variant).toBe('control');
  });
});
