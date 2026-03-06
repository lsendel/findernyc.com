import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/index';
import { __resetDashboardsForTests } from '../../src/insights/dashboards';

describe('Dashboard and insights API routes (week 22)', () => {
  beforeEach(() => {
    __resetDashboardsForTests();
  });

  it('creates, lists, and deletes user dashboards', async () => {
    const create = await app.request(
      '/api/dashboards',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: 'owner-1',
          name: 'Conversion KPI Board',
          cards: [
            {
              id: 'card-searches',
              metric: 'search_queries',
              title: 'Search Queries',
              visualization: 'kpi',
              window_days: 14,
            },
            {
              id: 'card-clicks',
              metric: 'search_clicks',
              title: 'Search Clicks',
              visualization: 'line',
              window_days: 14,
            },
          ],
          layout: {
            columns: 2,
            density: 'comfortable',
          },
        }),
      },
      { FEATURE_FLAGS: 'user_defined_dashboards' },
    );

    expect(create.status).toBe(200);
    const createBody = await create.json() as { success: boolean; item: { id: string; name: string } };
    expect(createBody.success).toBe(true);
    expect(createBody.item.name).toBe('Conversion KPI Board');

    const list = await app.request('/api/dashboards?owner_id=owner-1', { method: 'GET' }, { FEATURE_FLAGS: 'user_defined_dashboards' });
    expect(list.status).toBe(200);
    const listBody = await list.json() as { success: boolean; items: Array<{ id: string; cards: unknown[] }> };
    expect(listBody.success).toBe(true);
    expect(listBody.items.length).toBe(1);

    const remove = await app.request(
      `/api/dashboards/${listBody.items[0]?.id}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: 'owner-1' }),
      },
      { FEATURE_FLAGS: 'user_defined_dashboards' },
    );
    expect(remove.status).toBe(200);
  });

  it('returns insights hub summary when enabled', async () => {
    const res = await app.request('/api/dashboards/insights/hub?window_days=7', { method: 'GET' }, { FEATURE_FLAGS: 'insights_hub' });
    expect(res.status).toBe(200);

    const body = await res.json() as {
      success: boolean;
      summary: { window_days: number; trend_direction: string; funnel_health_score: number; top_bottleneck_stage: string };
      funnel: { searches: number; clicks: number };
      top_events: Array<{ event_name: string }>;
      query_clusters: Array<{ cluster_key: string; label: string }>;
      recommendations: Array<{ title: string; suggested_query: string }>;
      funnel_friction_alerts: Array<{ id: string; headline: string }>;
      automation_recommendations: Array<{ id: string; label: string; enabled_by_default: boolean }>;
      automation_tuning_rules: Array<{
        id: string;
        setting: boolean;
        confidence: string;
        reason: string;
        priority: string;
        cooldown_hours?: number;
      }>;
      weekly_playbook: {
        title: string;
        primary_goal: string;
        recommended_use_case: string;
        recommended_team_size: string;
        recommended_route: string;
        focus_query: string;
        confidence: string;
        confidence_reason: string;
        route_rationale: string;
        assumptions: string[];
        requires_manual_review: boolean;
        steps: string[];
      };
      playbook_execution: {
        completed_steps: number;
        sessions_with_completion: number;
        active_playbooks: number;
        adoption_rate: number;
      };
      playbook_outcome_delta: {
        completion_started_at: string | null;
        has_comparison: boolean;
        baseline_searches: number;
        followup_searches: number;
        click_through_rate_delta: number;
        inquiry_rate_delta: number;
        schedule_rate_delta: number;
        confidence: string;
      };
      playbook_recovery_recommendations: Array<{
        id: string;
        title: string;
        detail: string;
        suggested_query: string;
        priority: string;
      }>;
      recovery_outcome_delta: {
        recovery_started_at: string | null;
        total_runs: number;
        sessions_with_run: number;
        has_comparison: boolean;
        baseline_searches: number;
        followup_searches: number;
        click_through_rate_delta: number;
        inquiry_rate_delta: number;
        schedule_rate_delta: number;
        confidence: string;
      };
      recovery_escalation_actions: Array<{
        id: string;
        title: string;
        detail: string;
        suggested_query: string;
        priority: string;
      }>;
      recovery_escalation_attribution: {
        total_runs: number;
        manual_runs: number;
        auto_runs: number;
        actions: Array<{
          action_id: string;
          total_runs: number;
          manual_runs: number;
          auto_runs: number;
          sessions_with_run: number;
          last_run_at: string | null;
          success_score: number;
          recommended_mode: string;
        }>;
      };
    };
    expect(body.success).toBe(true);
    expect(body.summary.window_days).toBe(7);
    expect(['up', 'down', 'flat']).toContain(body.summary.trend_direction);
    expect(typeof body.summary.funnel_health_score).toBe('number');
    expect(['discover', 'convert', 'schedule', 'waitlist', 'balanced']).toContain(body.summary.top_bottleneck_stage);
    expect(typeof body.funnel.searches).toBe('number');
    expect(Array.isArray(body.top_events)).toBe(true);
    expect(Array.isArray(body.query_clusters)).toBe(true);
    expect(Array.isArray(body.recommendations)).toBe(true);
    expect(Array.isArray(body.funnel_friction_alerts)).toBe(true);
    expect(Array.isArray(body.automation_recommendations)).toBe(true);
    expect(Array.isArray(body.automation_tuning_rules)).toBe(true);
    expect(typeof body.weekly_playbook.title).toBe('string');
    expect(typeof body.weekly_playbook.primary_goal).toBe('string');
    expect(typeof body.weekly_playbook.confidence_reason).toBe('string');
    expect(typeof body.weekly_playbook.route_rationale).toBe('string');
    expect(Array.isArray(body.weekly_playbook.assumptions)).toBe(true);
    expect(typeof body.weekly_playbook.requires_manual_review).toBe('boolean');
    expect(Array.isArray(body.weekly_playbook.steps)).toBe(true);
    expect(typeof body.playbook_execution.completed_steps).toBe('number');
    expect(typeof body.playbook_execution.sessions_with_completion).toBe('number');
    expect(typeof body.playbook_execution.active_playbooks).toBe('number');
    expect(typeof body.playbook_execution.adoption_rate).toBe('number');
    expect(body.playbook_outcome_delta.completion_started_at === null || typeof body.playbook_outcome_delta.completion_started_at === 'string').toBe(true);
    expect(typeof body.playbook_outcome_delta.has_comparison).toBe('boolean');
    expect(typeof body.playbook_outcome_delta.baseline_searches).toBe('number');
    expect(typeof body.playbook_outcome_delta.followup_searches).toBe('number');
    expect(typeof body.playbook_outcome_delta.click_through_rate_delta).toBe('number');
    expect(typeof body.playbook_outcome_delta.inquiry_rate_delta).toBe('number');
    expect(typeof body.playbook_outcome_delta.schedule_rate_delta).toBe('number');
    expect(['high', 'medium', 'low']).toContain(body.playbook_outcome_delta.confidence);
    expect(Array.isArray(body.playbook_recovery_recommendations)).toBe(true);
    expect(body.recovery_outcome_delta.recovery_started_at === null || typeof body.recovery_outcome_delta.recovery_started_at === 'string').toBe(true);
    expect(typeof body.recovery_outcome_delta.total_runs).toBe('number');
    expect(typeof body.recovery_outcome_delta.sessions_with_run).toBe('number');
    expect(typeof body.recovery_outcome_delta.has_comparison).toBe('boolean');
    expect(typeof body.recovery_outcome_delta.baseline_searches).toBe('number');
    expect(typeof body.recovery_outcome_delta.followup_searches).toBe('number');
    expect(typeof body.recovery_outcome_delta.click_through_rate_delta).toBe('number');
    expect(typeof body.recovery_outcome_delta.inquiry_rate_delta).toBe('number');
    expect(typeof body.recovery_outcome_delta.schedule_rate_delta).toBe('number');
    expect(['high', 'medium', 'low']).toContain(body.recovery_outcome_delta.confidence);
    expect(Array.isArray(body.recovery_escalation_actions)).toBe(true);
    expect(typeof body.recovery_escalation_attribution.total_runs).toBe('number');
    expect(typeof body.recovery_escalation_attribution.manual_runs).toBe('number');
    expect(typeof body.recovery_escalation_attribution.auto_runs).toBe('number');
    expect(Array.isArray(body.recovery_escalation_attribution.actions)).toBe(true);
    if (body.recovery_escalation_attribution.actions[0]) {
      expect(typeof body.recovery_escalation_attribution.actions[0].success_score).toBe('number');
      expect(['manual', 'auto']).toContain(body.recovery_escalation_attribution.actions[0].recommended_mode);
    }
  });

  it('returns 503 for dashboards when feature is disabled', async () => {
    const res = await app.request('/api/dashboards?owner_id=owner-1', { method: 'GET' }, { FEATURE_FLAGS: '-user_defined_dashboards' });
    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('feature_disabled');
  });

  it('returns 422 for dashboards list when owner_id is missing', async () => {
    const res = await app.request('/api/dashboards', { method: 'GET' }, { FEATURE_FLAGS: 'user_defined_dashboards' });
    expect(res.status).toBe(422);
  });

  it('returns 503 for insights hub when feature is disabled', async () => {
    const res = await app.request('/api/dashboards/insights/hub?window_days=7', { method: 'GET' }, { FEATURE_FLAGS: '-insights_hub' });
    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('feature_disabled');
  });
});
