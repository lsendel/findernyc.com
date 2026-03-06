import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/index';
import { __resetFollowUpAutomationForTests } from '../../src/ai/follow-up';

describe('AI automation API routes (week 20)', () => {
  beforeEach(() => {
    __resetFollowUpAutomationForTests();
  });

  it('returns 503 when follow-up automation is disabled', async () => {
    const res = await app.request('/api/ai/follow-up/templates', {
      method: 'GET',
    });
    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('feature_disabled');
  });

  it('returns 422 when running follow-up automation without prior approval', async () => {
    const run = await app.request(
      '/api/ai/follow-up-automation',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: 'user@example.com',
          template_id: 'post_shortlist_check_in',
          context: {
            event_title: 'Rooftop Jazz Social',
            next_step: 'send one-click inquiry',
          },
        }),
      },
      { FEATURE_FLAGS: 'ai_follow_up_automation' },
    );

    expect(run.status).toBe(422);
    const body = await run.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('template_not_approved');
  });

  it('approves template and runs follow-up automation', async () => {
    const approve = await app.request(
      '/api/ai/follow-up/templates/post_shortlist_check_in/approve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: 'user@example.com' }),
      },
      { FEATURE_FLAGS: 'ai_follow_up_automation' },
    );

    expect(approve.status).toBe(200);

    const run = await app.request(
      '/api/ai/follow-up-automation',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: 'user@example.com',
          template_id: 'post_shortlist_check_in',
          context: {
            event_title: 'Rooftop Jazz Social',
            next_step: 'send one-click inquiry',
          },
          send_at_hour: 11,
        }),
      },
      { FEATURE_FLAGS: 'ai_follow_up_automation' },
    );

    expect(run.status).toBe(200);
    const runBody = await run.json() as {
      success: boolean;
      dispatch: { status: string; message: string; channel: string };
    };
    expect(runBody.success).toBe(true);
    expect(runBody.dispatch.status).toBe('queued');
    expect(runBody.dispatch.channel).toBe('email');
    expect(runBody.dispatch.message).toContain('Rooftop Jazz Social');
  });

  it('enforces suppression controls for opt-out', async () => {
    const setControls = await app.request(
      '/api/ai/suppression-controls',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: 'user@example.com',
          opt_out: true,
        }),
      },
      { FEATURE_FLAGS: 'ai_follow_up_automation' },
    );
    expect(setControls.status).toBe(200);

    await app.request(
      '/api/ai/follow-up/templates/post_shortlist_check_in/approve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: 'user@example.com' }),
      },
      { FEATURE_FLAGS: 'ai_follow_up_automation' },
    );

    const run = await app.request(
      '/api/ai/follow-up-automation',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: 'user@example.com',
          template_id: 'post_shortlist_check_in',
          context: {
            event_title: 'Late Night Food Tour',
            next_step: 'confirm availability',
          },
          send_at_hour: 10,
        }),
      },
      { FEATURE_FLAGS: 'ai_follow_up_automation' },
    );

    expect(run.status).toBe(200);
    const runBody = await run.json() as {
      success: boolean;
      dispatch: { status: string; suppression_reason?: string };
      suppression: { opt_out: boolean };
    };
    expect(runBody.success).toBe(true);
    expect(runBody.dispatch.status).toBe('suppressed');
    expect(runBody.dispatch.suppression_reason).toBe('opt_out');
    expect(runBody.suppression.opt_out).toBe(true);
  });

  it('returns next-best-action recommendations', async () => {
    const res = await app.request(
      '/api/ai/next-best-action',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: 'user@example.com',
          funnel_stage: 'consideration',
          intent: 'creative date night in brooklyn',
          max_actions: 3,
          send_at_hour: 14,
        }),
      },
      { FEATURE_FLAGS: 'ai_next_best_action' },
    );

    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      summary: string;
      actions: Array<{ id: string; title: string; reason: string }>;
      telemetry: { prompt_version: string };
    };
    expect(body.success).toBe(true);
    expect(body.summary.length).toBeGreaterThan(0);
    expect(body.actions.length).toBe(3);
    expect(body.actions[0]?.title.length).toBeGreaterThan(0);
    expect(body.telemetry.prompt_version).toBe('ai_next_best_action_prompt_v1');
  });

  it('returns 503 for next-best-action when feature is disabled', async () => {
    const res = await app.request('/api/ai/next-best-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: 'user@example.com',
      }),
    });
    expect(res.status).toBe(503);
  });

  it('returns 422 for invalid next-best-action payload', async () => {
    const res = await app.request(
      '/api/ai/next-best-action',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: 'user@example.com',
          funnel_stage: 'invalid-stage',
        }),
      },
      { FEATURE_FLAGS: 'ai_next_best_action' },
    );
    expect(res.status).toBe(422);
  });
});
