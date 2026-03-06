import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockValues, mockInsert, mockCreateDb } = vi.hoisted(() => {
  const mockValues = vi.fn();
  const mockInsert = vi.fn();
  const mockCreateDb = vi.fn();
  return { mockValues, mockInsert, mockCreateDb };
});

vi.mock('../../src/db/client', () => ({
  createDb: mockCreateDb,
}));

import app from '../../src/index';

const VALID_EVENT_NAMES = [
  'cta_click',
  'section_view',
  'faq_expand',
  'pricing_tab_view',
  'search_query',
  'search_result_click',
  'inquiry_started',
  'inquiry_submitted',
  'schedule_requested',
  'schedule_conflict',
  'schedule_confirmed',
  'ai_concierge_prompt',
  'ai_concierge_response',
  'ai_shortlist_generated',
  'ai_fallback_triggered',
  'ai_negotiation_prep_generated',
  'ai_document_helper_generated',
  'ai_quality_sampled',
  'ai_quality_review_decision',
  'ai_follow_up_automation_run',
  'ai_next_best_action_generated',
  'ux_locale_applied',
  'accessibility_mode_updated',
  'insights_hub_view',
  'partner_ops_view',
  'onboarding_defaults_applied',
  'waitlist_route_preview_updated',
  'waitlist_submit_attempted',
  'waitlist_submit_succeeded',
  'marketing_snapshot_automation_applied',
  'marketing_snapshot_playbook_intake_opened',
  'marketing_snapshot_playbook_step_updated',
  'marketing_snapshot_recovery_query_run',
  'marketing_snapshot_recovery_escalation_run',
  'marketing_snapshot_tuning_rule_applied',
  'contact_playbook_route_reconciled',
  'contact_goal_template_applied',
  'contact_form_draft_restored',
] as const;
const VALID_EVENT_PAYLOADS = {
  cta_click: {
    event_name: 'cta_click',
    properties: { cta_label: 'Find Events Near Me', section: 'hero' },
  },
  section_view: {
    event_name: 'section_view',
    properties: { section_name: 'features' },
  },
  faq_expand: {
    event_name: 'faq_expand',
    properties: { question_index: 0 },
  },
  pricing_tab_view: {
    event_name: 'pricing_tab_view',
    properties: { tab_name: 'business' },
  },
  search_query: {
    event_name: 'search_query',
    properties: { query_text: 'free jazz in brooklyn', result_count: 2, borough: 'brooklyn', category: 'music' },
  },
  search_result_click: {
    event_name: 'search_result_click',
    properties: {
      query_text: 'free jazz in brooklyn',
      event_id: 'evt_001',
      rank_position: 1,
      borough: 'brooklyn',
      category: 'music',
      ranking_strategy: 'personalized_best_value',
      personalization_score: 74.2,
      best_value_score: 81.5,
      neighborhood_fit_score: 82.5,
      neighborhood_fit_band: 'strong',
      neighborhood_fit_dominant_vibe: 'creative',
      neighborhood_fit_personalized: true,
      verification_status: 'verified',
      fraud_risk_score: 18,
      fraud_risk_band: 'low',
      fraud_review_route: 'allow',
      review_authenticity_score: 88,
      review_authenticity_band: 'trusted',
      review_suppressed_count: 0,
      experiment_assignments: ['ranking_blend_v1:control', 'trust_controls_v1:treatment'],
    },
  },
  inquiry_started: {
    event_name: 'inquiry_started',
    properties: {
      event_id: 'evt_001',
      inquiry_surface: 'search_result_card',
      autofill_available: true,
    },
  },
  inquiry_submitted: {
    event_name: 'inquiry_submitted',
    properties: {
      event_id: 'evt_001',
      inquiry_id: 'inq_abc123',
      profile_source: 'mixed',
      preferred_contact_channel: 'email',
    },
  },
  schedule_requested: {
    event_name: 'schedule_requested',
    properties: {
      inquiry_id: 'inq_abc123',
      event_id: 'evt_001',
      provider: 'google_calendar',
      start_at: '2026-03-02T18:00:00.000Z',
    },
  },
  schedule_conflict: {
    event_name: 'schedule_conflict',
    properties: {
      inquiry_id: 'inq_abc123',
      event_id: 'evt_001',
      provider: 'google_calendar',
      conflict_count: 2,
    },
  },
  schedule_confirmed: {
    event_name: 'schedule_confirmed',
    properties: {
      inquiry_id: 'inq_abc123',
      event_id: 'evt_001',
      provider: 'google_calendar',
      scheduled_id: 'sch_123',
      delivery: 'stub',
    },
  },
  ai_concierge_prompt: {
    event_name: 'ai_concierge_prompt',
    properties: {
      query_text: 'recommend brooklyn art under $30',
      retrieval_limit: 4,
    },
  },
  ai_concierge_response: {
    event_name: 'ai_concierge_response',
    properties: {
      query_text: 'recommend brooklyn art under $30',
      citation_count: 3,
      prompt_version: 'ai_concierge_prompt_v1',
      model_version: 'concierge-test-v1',
      fallback_used: false,
    },
  },
  ai_shortlist_generated: {
    event_name: 'ai_shortlist_generated',
    properties: {
      intent: 'creative date night',
      shortlist_count: 3,
      prompt_version: 'ai_shortlist_prompt_v1',
      model_version: 'shortlist-test-v1',
      fallback_used: true,
    },
  },
  ai_fallback_triggered: {
    event_name: 'ai_fallback_triggered',
    properties: {
      feature: 'ai_shortlist_builder',
      reason: 'model_unavailable',
      prompt_version: 'ai_shortlist_prompt_v1',
      model_version: 'shortlist-test-v1',
    },
  },
  ai_negotiation_prep_generated: {
    event_name: 'ai_negotiation_prep_generated',
    properties: {
      goal_text: 'reduce total fees and secure cancellation flexibility',
      talking_point_count: 4,
      prompt_version: 'ai_negotiation_prep_prompt_v1',
      model_version: 'negotiation-test-v1',
      fallback_used: false,
    },
  },
  ai_document_helper_generated: {
    event_name: 'ai_document_helper_generated',
    properties: {
      document_length: 450,
      checklist_count: 5,
      prompt_version: 'ai_document_helper_prompt_v1',
      model_version: 'doc-test-v1',
      fallback_used: true,
    },
  },
  ai_quality_sampled: {
    event_name: 'ai_quality_sampled',
    properties: {
      feature: 'ai_document_helper',
      sample_id: 'ai_sample_123',
      quality_score: 2.6,
      quality_band: 'low',
    },
  },
  ai_quality_review_decision: {
    event_name: 'ai_quality_review_decision',
    properties: {
      sample_id: 'ai_sample_123',
      decision: 'needs_revision',
      reviewer: 'ops-reviewer-1',
    },
  },
  ai_follow_up_automation_run: {
    event_name: 'ai_follow_up_automation_run',
    properties: {
      template_id: 'post_shortlist_check_in',
      dispatch_status: 'queued',
      channel: 'email',
    },
  },
  ai_next_best_action_generated: {
    event_name: 'ai_next_best_action_generated',
    properties: {
      action_count: 3,
      funnel_stage: 'consideration',
      model_version: 'next-best-action-local-2026-03-01',
      suppressed_actions: 1,
    },
  },
  ux_locale_applied: {
    event_name: 'ux_locale_applied',
    properties: {
      requested_locale: 'es-US',
      resolved_locale: 'es-US',
    },
  },
  accessibility_mode_updated: {
    event_name: 'accessibility_mode_updated',
    properties: {
      high_contrast: true,
      reduced_motion: false,
      keyboard_first: true,
    },
  },
  insights_hub_view: {
    event_name: 'insights_hub_view',
    properties: {
      window_days: 14,
      trend_direction: 'flat',
      total_events: 18,
    },
  },
  partner_ops_view: {
    event_name: 'partner_ops_view',
    properties: {
      workspace_id: 'pilot_workspace',
      active_phase: 'sandbox_validation',
      role_template_count: 5,
    },
  },
  onboarding_defaults_applied: {
    event_name: 'onboarding_defaults_applied',
    properties: {
      role: 'marketer',
      apply_mode: 'quick_pack',
      auto_alert_enabled: true,
      autofill_lead_enabled: true,
    },
  },
  waitlist_route_preview_updated: {
    event_name: 'waitlist_route_preview_updated',
    properties: {
      surface: 'landing',
      route: 'marketing_consult',
      submit_label: 'Request Marketing Consult',
      use_case: 'marketing_analytics',
      team_size: 'small_2_10',
    },
  },
  waitlist_submit_attempted: {
    event_name: 'waitlist_submit_attempted',
    properties: {
      surface: 'contact',
      route: 'self_serve_onboarding',
      submit_label: 'Start Self-Serve Setup',
      use_case: 'business_listing',
      team_size: 'solo',
    },
  },
  waitlist_submit_succeeded: {
    event_name: 'waitlist_submit_succeeded',
    properties: {
      surface: 'landing',
      route: 'marketing_consult',
      submit_label: 'Request Marketing Consult',
      use_case: 'marketing_analytics',
      team_size: 'small_2_10',
    },
  },
  marketing_snapshot_automation_applied: {
    event_name: 'marketing_snapshot_automation_applied',
    properties: {
      surface: 'landing',
      automation_id: 'auto_run_top_opportunity',
      enabled: true,
      source: 'manual_click',
    },
  },
  marketing_snapshot_playbook_intake_opened: {
    event_name: 'marketing_snapshot_playbook_intake_opened',
    properties: {
      surface: 'landing',
      use_case: 'marketing_analytics',
      team_size: 'small_2_10',
      route: 'marketing_consult',
      confidence: 'high',
    },
  },
  marketing_snapshot_playbook_step_updated: {
    event_name: 'marketing_snapshot_playbook_step_updated',
    properties: {
      surface: 'landing',
      playbook_key: 'marketing_consult|local events|weekly playbook',
      step_index: 1,
      completed: true,
      route: 'marketing_consult',
      confidence: 'medium',
    },
  },
  marketing_snapshot_recovery_query_run: {
    event_name: 'marketing_snapshot_recovery_query_run',
    properties: {
      surface: 'landing',
      recommendation_id: 'ctr_recovery',
      priority: 'high',
      query_text: 'local event discovery ranking opportunities',
      outcome_confidence: 'medium',
      source: 'manual_click',
    },
  },
  marketing_snapshot_recovery_escalation_run: {
    event_name: 'marketing_snapshot_recovery_escalation_run',
    properties: {
      surface: 'landing',
      action_id: 'escalate_metadata_audit',
      priority: 'high',
      query_text: 'local event discovery ranking opportunities title snippet audit',
      recovery_confidence: 'medium',
      source: 'manual_click',
    },
  },
  marketing_snapshot_tuning_rule_applied: {
    event_name: 'marketing_snapshot_tuning_rule_applied',
    properties: {
      surface: 'landing',
      rule_id: 'tune_auto_run_escalation',
      setting: true,
      confidence: 'high',
      source: 'auto_apply_rule',
    },
  },
  contact_playbook_route_reconciled: {
    event_name: 'contact_playbook_route_reconciled',
    properties: {
      surface: 'contact',
      hinted_route: 'marketing_consult',
      resolved_route: 'marketing_consult',
      confidence: 'medium',
      aligned: true,
    },
  },
  contact_goal_template_applied: {
    event_name: 'contact_goal_template_applied',
    properties: {
      template_id: 'marketing_cluster_coverage',
      use_case: 'marketing_analytics',
      goal_length: 96,
    },
  },
  contact_form_draft_restored: {
    event_name: 'contact_form_draft_restored',
    properties: {
      restored_fields: 4,
    },
  },
} as const;

describe('POST /api/analytics/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockResolvedValue([]);
    mockInsert.mockReturnValue({ values: mockValues });
    mockCreateDb.mockReturnValue({ insert: mockInsert });
  });

  for (const event_name of VALID_EVENT_NAMES) {
    it(`returns 204 for valid "${event_name}" payload`, async () => {
      const res = await app.request('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_EVENT_PAYLOADS[event_name]),
      });

      expect(res.status).toBe(204);
    });
  }

  it('returns 422 on unknown event_name', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: 'unknown_event' }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 422 on missing event_name', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { foo: 'bar' } }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 422 when required properties are missing for event_name', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: 'cta_click' }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 422 for invalid pricing tab_name', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'pricing_tab_view',
        properties: { tab_name: 'enterprise' },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when search_query payload is missing result_count', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'search_query',
        properties: { query_text: 'food in queens' },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when search_result_click payload is missing rank_position', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'search_result_click',
        properties: { query_text: 'food in queens', event_id: 'evt_003' },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when search_result_click neighborhood_fit_band is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'search_result_click',
        properties: {
          query_text: 'food in queens',
          event_id: 'evt_003',
          rank_position: 2,
          neighborhood_fit_band: 'great',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when search_result_click neighborhood_fit_score is out of range', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'search_result_click',
        properties: {
          query_text: 'food in queens',
          event_id: 'evt_003',
          rank_position: 2,
          neighborhood_fit_score: 200,
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when search_result_click ranking_strategy is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'search_result_click',
        properties: {
          query_text: 'food in queens',
          event_id: 'evt_003',
          rank_position: 2,
          ranking_strategy: 'dynamic',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when search_result_click fraud_risk_band is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'search_result_click',
        properties: {
          query_text: 'food in queens',
          event_id: 'evt_003',
          rank_position: 2,
          fraud_risk_band: 'critical',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when search_result_click review_authenticity_band is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'search_result_click',
        properties: {
          query_text: 'food in queens',
          event_id: 'evt_003',
          rank_position: 2,
          review_authenticity_band: 'safe',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when inquiry_submitted is missing inquiry_id', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'inquiry_submitted',
        properties: {
          event_id: 'evt_001',
          profile_source: 'manual_input',
          preferred_contact_channel: 'email',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when schedule_requested provider is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'schedule_requested',
        properties: {
          inquiry_id: 'inq_abc123',
          event_id: 'evt_001',
          provider: 'not_a_provider',
          start_at: '2026-03-02T18:00:00.000Z',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when ai_concierge_prompt is missing retrieval_limit', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'ai_concierge_prompt',
        properties: {
          query_text: 'cheap food in queens',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when ai_fallback_triggered feature is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'ai_fallback_triggered',
        properties: {
          feature: 'unknown_feature',
          reason: 'model_unavailable',
          prompt_version: 'ai_shortlist_prompt_v1',
          model_version: 'shortlist-test-v1',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when recovery query run source is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'marketing_snapshot_recovery_query_run',
        properties: {
          surface: 'landing',
          recommendation_id: 'ctr_recovery',
          priority: 'high',
          query_text: 'local event discovery ranking opportunities',
          outcome_confidence: 'medium',
          source: 'scheduled_job',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when recovery escalation action_id is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'marketing_snapshot_recovery_escalation_run',
        properties: {
          surface: 'landing',
          action_id: 'random_action',
          priority: 'high',
          query_text: 'local event discovery ranking opportunities title snippet audit',
          recovery_confidence: 'medium',
          source: 'manual_click',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when recovery escalation source is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'marketing_snapshot_recovery_escalation_run',
        properties: {
          surface: 'landing',
          action_id: 'escalate_metadata_audit',
          priority: 'high',
          query_text: 'local event discovery ranking opportunities title snippet audit',
          recovery_confidence: 'medium',
          source: 'workflow_bot',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 422 when tuning-rule-applied source is invalid', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'marketing_snapshot_tuning_rule_applied',
        properties: {
          surface: 'landing',
          rule_id: 'tune_auto_run_recovery',
          setting: true,
          confidence: 'high',
          source: 'scheduler',
        },
      }),
    });

    expect(res.status).toBe(422);
  });

  it('returns 204 with optional properties and session_id', async () => {
    const res = await app.request('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'cta_click',
        properties: { cta_label: 'Find Events Near Me', section: 'hero', campaign: 'winter' },
        session_id: 'abc123',
      }),
    });

    expect(res.status).toBe(204);
  });
});
