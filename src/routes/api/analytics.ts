import { Hono } from 'hono';
import { z } from 'zod';
import { createDb } from '../../db/client';
import { analytics_events } from '../../db/schema';
import { recordExperimentClickOutcomes } from '../../experiments/framework';

type Env = { Bindings: { DATABASE_URL?: string } };

export const analyticsRouter = new Hono<Env>();
const ANALYTICS_SCHEMA_VERSION = '2026-02-28';

const bodySchema = z.object({
  event_name: z.enum([
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
  ]),
  properties: z.record(z.unknown()).optional(),
  session_id: z.string().max(64).optional(),
});

type AnalyticsEventName = z.infer<typeof bodySchema>['event_name'];

const eventPropertySchemas: Record<AnalyticsEventName, z.ZodObject<z.ZodRawShape>> = {
  cta_click: z.object({
    cta_label: z.string().min(1),
    section: z.string().min(1),
  }).passthrough(),
  section_view: z.object({
    section_name: z.string().min(1),
  }).passthrough(),
  faq_expand: z.object({
    question_index: z.number().int().nonnegative(),
  }).passthrough(),
  pricing_tab_view: z.object({
    tab_name: z.enum(['consumer', 'business']),
  }).passthrough(),
  search_query: z.object({
    query_text: z.string().min(2).max(200),
    result_count: z.number().int().nonnegative(),
    borough: z.enum(['manhattan', 'brooklyn', 'queens', 'bronx', 'staten_island']).optional(),
    category: z.enum(['music', 'food', 'arts', 'networking', 'family', 'wellness']).optional(),
  }).passthrough(),
  search_result_click: z.object({
    query_text: z.string().min(2).max(200),
    event_id: z.string().min(1),
    rank_position: z.number().int().positive(),
    borough: z.enum(['manhattan', 'brooklyn', 'queens', 'bronx', 'staten_island']).optional(),
    category: z.enum(['music', 'food', 'arts', 'networking', 'family', 'wellness']).optional(),
    ranking_strategy: z.enum(['baseline', 'personalized', 'best_value', 'personalized_best_value']).optional(),
    personalization_score: z.number().min(0).max(100).optional(),
    best_value_score: z.number().min(0).max(100).optional(),
    neighborhood_fit_score: z.number().min(0).max(100).optional(),
    neighborhood_fit_band: z.enum(['strong', 'moderate', 'weak']).optional(),
    neighborhood_fit_dominant_vibe: z.enum([
      'creative',
      'family',
      'foodie',
      'professional',
      'quiet',
      'nightlife',
      'wellness',
    ]).optional(),
    neighborhood_fit_personalized: z.boolean().optional(),
    verification_status: z.enum(['verified', 'pending', 'unverified']).optional(),
    fraud_risk_score: z.number().min(0).max(100).optional(),
    fraud_risk_band: z.enum(['low', 'medium', 'high']).optional(),
    fraud_review_route: z.enum(['allow', 'review_queue', 'block']).optional(),
    review_authenticity_score: z.number().min(0).max(100).optional(),
    review_authenticity_band: z.enum(['trusted', 'mixed', 'suspicious']).optional(),
    review_suppressed_count: z.number().int().nonnegative().optional(),
    experiment_assignments: z.array(z.string()).max(6).optional(),
  }).passthrough(),
  inquiry_started: z.object({
    event_id: z.string().min(1),
    inquiry_surface: z.enum(['search_result_card', 'event_detail']),
    autofill_available: z.boolean(),
  }).passthrough(),
  inquiry_submitted: z.object({
    event_id: z.string().min(1),
    inquiry_id: z.string().min(1),
    profile_source: z.enum(['saved_profile', 'manual_input', 'mixed']),
    preferred_contact_channel: z.enum(['email', 'sms', 'phone']),
  }).passthrough(),
  schedule_requested: z.object({
    inquiry_id: z.string().min(1),
    event_id: z.string().min(1),
    provider: z.enum(['google_calendar', 'outlook_calendar', 'apple_calendar']),
    start_at: z.string().datetime(),
  }).passthrough(),
  schedule_conflict: z.object({
    inquiry_id: z.string().min(1),
    event_id: z.string().min(1),
    provider: z.enum(['google_calendar', 'outlook_calendar', 'apple_calendar']),
    conflict_count: z.number().int().positive(),
  }).passthrough(),
  schedule_confirmed: z.object({
    inquiry_id: z.string().min(1),
    event_id: z.string().min(1),
    provider: z.enum(['google_calendar', 'outlook_calendar', 'apple_calendar']),
    scheduled_id: z.string().min(1),
    delivery: z.enum(['stub', 'queued']),
  }).passthrough(),
  ai_concierge_prompt: z.object({
    query_text: z.string().min(2).max(240),
    retrieval_limit: z.number().int().min(1).max(8),
  }).passthrough(),
  ai_concierge_response: z.object({
    query_text: z.string().min(2).max(240),
    citation_count: z.number().int().nonnegative(),
    prompt_version: z.string().min(1),
    model_version: z.string().min(1),
    fallback_used: z.boolean(),
  }).passthrough(),
  ai_shortlist_generated: z.object({
    intent: z.string().min(2).max(240),
    shortlist_count: z.number().int().nonnegative(),
    prompt_version: z.string().min(1),
    model_version: z.string().min(1),
    fallback_used: z.boolean(),
  }).passthrough(),
  ai_fallback_triggered: z.object({
    feature: z.enum([
      'ai_concierge_chat',
      'ai_shortlist_builder',
      'ai_negotiation_prep_assistant',
      'ai_document_helper',
      'ai_follow_up_automation',
      'ai_next_best_action',
    ]),
    reason: z.string().min(1),
    prompt_version: z.string().min(1),
    model_version: z.string().min(1),
  }).passthrough(),
  ai_negotiation_prep_generated: z.object({
    goal_text: z.string().min(2).max(400),
    talking_point_count: z.number().int().positive(),
    prompt_version: z.string().min(1),
    model_version: z.string().min(1),
    fallback_used: z.boolean(),
  }).passthrough(),
  ai_document_helper_generated: z.object({
    document_length: z.number().int().positive(),
    checklist_count: z.number().int().nonnegative(),
    prompt_version: z.string().min(1),
    model_version: z.string().min(1),
    fallback_used: z.boolean(),
  }).passthrough(),
  ai_quality_sampled: z.object({
    feature: z.enum(['ai_concierge_chat', 'ai_shortlist_builder', 'ai_negotiation_prep_assistant', 'ai_document_helper']),
    sample_id: z.string().min(1),
    quality_score: z.number().min(0).max(5),
    quality_band: z.enum(['high', 'medium', 'low']),
  }).passthrough(),
  ai_quality_review_decision: z.object({
    sample_id: z.string().min(1),
    decision: z.enum(['approved', 'needs_revision']),
    reviewer: z.string().min(1).optional(),
  }).passthrough(),
  ai_follow_up_automation_run: z.object({
    template_id: z.string().min(1),
    dispatch_status: z.enum(['queued', 'suppressed']),
    suppression_reason: z.enum(['opt_out', 'quiet_hours', 'frequency_cap']).optional(),
    channel: z.enum(['email', 'sms', 'push']).optional(),
  }).passthrough(),
  ai_next_best_action_generated: z.object({
    action_count: z.number().int().positive(),
    funnel_stage: z.enum(['discovery', 'consideration', 'negotiation', 'ready_to_book', 'post_inquiry']),
    model_version: z.string().min(1),
    suppressed_actions: z.number().int().nonnegative().optional(),
  }).passthrough(),
  ux_locale_applied: z.object({
    requested_locale: z.string().min(2).max(20),
    resolved_locale: z.string().min(2).max(20),
  }).passthrough(),
  accessibility_mode_updated: z.object({
    high_contrast: z.boolean(),
    reduced_motion: z.boolean(),
    keyboard_first: z.boolean(),
  }).passthrough(),
  insights_hub_view: z.object({
    window_days: z.number().int().positive(),
    trend_direction: z.enum(['up', 'down', 'flat']),
    total_events: z.number().int().nonnegative(),
  }).passthrough(),
  partner_ops_view: z.object({
    workspace_id: z.string().min(1),
    active_phase: z.enum(['sandbox_validation', 'staging_dry_run', 'limited_production', 'general_availability']),
    role_template_count: z.number().int().nonnegative(),
  }).passthrough(),
  onboarding_defaults_applied: z.object({
    role: z.enum(['consumer', 'marketer', 'business']),
    apply_mode: z.enum(['manual', 'quick_pack']),
    auto_alert_enabled: z.boolean(),
    autofill_lead_enabled: z.boolean(),
  }).passthrough(),
  waitlist_route_preview_updated: z.object({
    surface: z.enum(['landing', 'contact']),
    route: z.enum(['community_waitlist', 'self_serve_onboarding', 'marketing_consult', 'sales_demo', 'partnership_review']),
    submit_label: z.string().min(1),
    use_case: z.enum(['consumer_discovery', 'business_listing', 'marketing_analytics', 'agency_partnership']).optional(),
    team_size: z.enum(['solo', 'small_2_10', 'mid_11_50', 'enterprise_50_plus']).optional(),
  }).passthrough(),
  waitlist_submit_attempted: z.object({
    surface: z.enum(['landing', 'contact']),
    route: z.enum(['community_waitlist', 'self_serve_onboarding', 'marketing_consult', 'sales_demo', 'partnership_review']),
    submit_label: z.string().min(1),
    use_case: z.enum(['consumer_discovery', 'business_listing', 'marketing_analytics', 'agency_partnership']).optional(),
    team_size: z.enum(['solo', 'small_2_10', 'mid_11_50', 'enterprise_50_plus']).optional(),
  }).passthrough(),
  waitlist_submit_succeeded: z.object({
    surface: z.enum(['landing', 'contact']),
    route: z.enum(['community_waitlist', 'self_serve_onboarding', 'marketing_consult', 'sales_demo', 'partnership_review']),
    submit_label: z.string().min(1),
    use_case: z.enum(['consumer_discovery', 'business_listing', 'marketing_analytics', 'agency_partnership']).optional(),
    team_size: z.enum(['solo', 'small_2_10', 'mid_11_50', 'enterprise_50_plus']).optional(),
  }).passthrough(),
  marketing_snapshot_automation_applied: z.object({
    surface: z.literal('landing'),
    automation_id: z.enum([
      'auto_run_top_opportunity',
      'auto_create_saved_alert',
      'autofill_intake_profile',
      'instant_role_setup',
      'auto_schedule_after_inquiry',
    ]),
    enabled: z.boolean(),
    source: z.enum(['manual_click', 'auto_apply_defaults']),
  }).passthrough(),
  marketing_snapshot_playbook_intake_opened: z.object({
    surface: z.literal('landing'),
    use_case: z.enum(['consumer_discovery', 'business_listing', 'marketing_analytics', 'agency_partnership']),
    team_size: z.enum(['solo', 'small_2_10', 'mid_11_50', 'enterprise_50_plus']),
    route: z.enum(['community_waitlist', 'self_serve_onboarding', 'marketing_consult', 'sales_demo', 'partnership_review']),
    confidence: z.enum(['high', 'medium', 'low']),
  }).passthrough(),
  marketing_snapshot_playbook_step_updated: z.object({
    surface: z.literal('landing'),
    playbook_key: z.string().min(3).max(240),
    step_index: z.number().int().nonnegative(),
    completed: z.boolean(),
    route: z.enum(['community_waitlist', 'self_serve_onboarding', 'marketing_consult', 'sales_demo', 'partnership_review']),
    confidence: z.enum(['high', 'medium', 'low']),
  }).passthrough(),
  marketing_snapshot_recovery_query_run: z.object({
    surface: z.literal('landing'),
    recommendation_id: z.enum(['ctr_recovery', 'inquiry_recovery', 'schedule_recovery', 'momentum_scale']),
    priority: z.enum(['high', 'medium', 'low']),
    query_text: z.string().min(2).max(180),
    outcome_confidence: z.enum(['high', 'medium', 'low']),
    source: z.enum(['manual_click', 'auto_run_default']),
  }).passthrough(),
  marketing_snapshot_recovery_escalation_run: z.object({
    surface: z.literal('landing'),
    action_id: z.enum([
      'escalate_metadata_audit',
      'escalate_cta_trust',
      'escalate_followup_automation',
      'codify_recovery_playbook',
    ]),
    priority: z.enum(['high', 'medium', 'low']),
    query_text: z.string().min(2).max(180),
    recovery_confidence: z.enum(['high', 'medium', 'low']),
    source: z.enum(['manual_click', 'auto_run_default']),
  }).passthrough(),
  marketing_snapshot_tuning_rule_applied: z.object({
    surface: z.literal('landing'),
    rule_id: z.enum([
      'tune_auto_run_top_opportunity',
      'tune_auto_run_recovery',
      'tune_auto_run_escalation',
      'tune_auto_apply_recommended',
    ]),
    setting: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']),
    source: z.enum(['auto_apply_rule', 'manual_sync']),
  }).passthrough(),
  contact_playbook_route_reconciled: z.object({
    surface: z.literal('contact'),
    hinted_route: z.enum(['community_waitlist', 'self_serve_onboarding', 'marketing_consult', 'sales_demo', 'partnership_review']),
    resolved_route: z.enum(['community_waitlist', 'self_serve_onboarding', 'marketing_consult', 'sales_demo', 'partnership_review']),
    confidence: z.enum(['high', 'medium', 'low']).optional(),
    aligned: z.boolean(),
  }).passthrough(),
  contact_goal_template_applied: z.object({
    template_id: z.string().min(1),
    use_case: z.enum(['consumer_discovery', 'business_listing', 'marketing_analytics', 'agency_partnership']).optional(),
    goal_length: z.number().int().positive().optional(),
  }).passthrough(),
  contact_form_draft_restored: z.object({
    restored_fields: z.number().int().positive(),
  }).passthrough(),
};

analyticsRouter.post('/events', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const { event_name, properties, session_id } = parsed.data;
  const propertiesResult = eventPropertySchemas[event_name].safeParse(properties ?? {});
  if (!propertiesResult.success) {
    return c.json(
      { success: false, error: propertiesResult.error.issues[0]?.message ?? 'invalid_properties' },
      422,
    );
  }
  if (event_name === 'search_result_click') {
    recordExperimentClickOutcomes(propertiesResult.data.experiment_assignments);
  }

  const databaseUrl = c.env?.DATABASE_URL ?? '';
  if (!databaseUrl) {
    // Allow page analytics to degrade gracefully in environments without DB bindings.
    return new Response(null, { status: 204 });
  }

  const db = createDb(databaseUrl);
  const normalizedProperties = {
    ...propertiesResult.data,
    _schema_version: ANALYTICS_SCHEMA_VERSION,
  };
  await db.insert(analytics_events).values({ event_name, properties: normalizedProperties, session_id });
  return new Response(null, { status: 204 });
});
