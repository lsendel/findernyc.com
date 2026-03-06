import { describe, it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { contract } from '../../src/contract';

// Feature: local-event-discovery-landing-page
// Validates: Requirements 14.1–14.4

describe('contract shape — compile-time type assertions', () => {
  describe('submitLead', () => {
    it('has method POST', () => {
      expectTypeOf(contract.submitLead.method).toEqualTypeOf<'POST'>();
    });

    it('has path /api/leads', () => {
      expectTypeOf(contract.submitLead.path).toEqualTypeOf<'/api/leads'>();
    });

    it('body schema infers email as string', () => {
      type Body = z.infer<typeof contract.submitLead.body>;
      expectTypeOf<Body['email']>().toEqualTypeOf<string>();
    });

    it('body schema infers source_cta as optional string', () => {
      type Body = z.infer<typeof contract.submitLead.body>;
      expectTypeOf<Body['source_cta']>().toEqualTypeOf<string | undefined>();
    });

    it('body schema infers source_section as optional string', () => {
      type Body = z.infer<typeof contract.submitLead.body>;
      expectTypeOf<Body['source_section']>().toEqualTypeOf<string | undefined>();
    });

    it('body schema infers use_case as optional enum', () => {
      type Body = z.infer<typeof contract.submitLead.body>;
      expectTypeOf<Body['use_case']>().toEqualTypeOf<
        'consumer_discovery' | 'business_listing' | 'marketing_analytics' | 'agency_partnership' | undefined
      >();
    });

    it('body schema infers team_size as optional enum', () => {
      type Body = z.infer<typeof contract.submitLead.body>;
      expectTypeOf<Body['team_size']>().toEqualTypeOf<
        'solo' | 'small_2_10' | 'mid_11_50' | 'enterprise_50_plus' | undefined
      >();
    });

    it('body schema infers city as optional string', () => {
      type Body = z.infer<typeof contract.submitLead.body>;
      expectTypeOf<Body['city']>().toEqualTypeOf<string | undefined>();
    });

    it('body schema infers borough as optional enum', () => {
      type Body = z.infer<typeof contract.submitLead.body>;
      expectTypeOf<Body['borough']>().toEqualTypeOf<
        'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island' | undefined
      >();
    });

    it('body schema infers goal as optional string', () => {
      type Body = z.infer<typeof contract.submitLead.body>;
      expectTypeOf<Body['goal']>().toEqualTypeOf<string | undefined>();
    });
  });

  describe('joinWaitlist', () => {
    it('has method POST', () => {
      expectTypeOf(contract.joinWaitlist.method).toEqualTypeOf<'POST'>();
    });

    it('has path /api/waitlist', () => {
      expectTypeOf(contract.joinWaitlist.path).toEqualTypeOf<'/api/waitlist'>();
    });

    it('body schema infers email as string', () => {
      type Body = z.infer<typeof contract.joinWaitlist.body>;
      expectTypeOf<Body['email']>().toEqualTypeOf<string>();
    });

    it('body schema infers zip_code as optional string', () => {
      type Body = z.infer<typeof contract.joinWaitlist.body>;
      expectTypeOf<Body['zip_code']>().toEqualTypeOf<string | undefined>();
    });

    it('body schema infers city as optional string', () => {
      type Body = z.infer<typeof contract.joinWaitlist.body>;
      expectTypeOf<Body['city']>().toEqualTypeOf<string | undefined>();
    });
  });

  describe('logAnalyticsEvent', () => {
    it('has method POST', () => {
      expectTypeOf(contract.logAnalyticsEvent.method).toEqualTypeOf<'POST'>();
    });

    it('has path /api/analytics/events', () => {
      expectTypeOf(contract.logAnalyticsEvent.path).toEqualTypeOf<'/api/analytics/events'>();
    });

    it('body schema infers event_name as the correct enum union', () => {
      type Body = z.infer<typeof contract.logAnalyticsEvent.body>;
      type ExpectedEventName =
        | 'cta_click'
        | 'section_view'
        | 'faq_expand'
        | 'pricing_tab_view'
        | 'search_query'
        | 'search_result_click'
        | 'inquiry_started'
        | 'inquiry_submitted'
        | 'schedule_requested'
        | 'schedule_conflict'
        | 'schedule_confirmed'
        | 'ai_concierge_prompt'
        | 'ai_concierge_response'
        | 'ai_shortlist_generated'
        | 'ai_fallback_triggered'
        | 'ai_negotiation_prep_generated'
        | 'ai_document_helper_generated'
        | 'ai_quality_sampled'
        | 'ai_quality_review_decision'
        | 'ai_follow_up_automation_run'
        | 'ai_next_best_action_generated'
        | 'ux_locale_applied'
        | 'accessibility_mode_updated'
        | 'insights_hub_view'
        | 'partner_ops_view'
        | 'onboarding_defaults_applied'
        | 'waitlist_route_preview_updated'
        | 'waitlist_submit_attempted'
        | 'waitlist_submit_succeeded'
        | 'marketing_snapshot_automation_applied'
        | 'marketing_snapshot_playbook_intake_opened'
        | 'marketing_snapshot_playbook_step_updated'
        | 'marketing_snapshot_recovery_query_run'
        | 'marketing_snapshot_recovery_escalation_run'
        | 'marketing_snapshot_tuning_rule_applied'
        | 'contact_playbook_route_reconciled'
        | 'contact_goal_template_applied'
        | 'contact_form_draft_restored';

      expectTypeOf<Exclude<ExpectedEventName, Body['event_name']>>().toEqualTypeOf<never>();
      expectTypeOf<Exclude<Body['event_name'], ExpectedEventName>>().toEqualTypeOf<never>();
    });

    it('body schema infers properties as optional record', () => {
      type Body = z.infer<typeof contract.logAnalyticsEvent.body>;
      expectTypeOf<Body['properties']>().toEqualTypeOf<Record<string, unknown> | undefined>();
    });

    it('body schema infers session_id as optional string', () => {
      type Body = z.infer<typeof contract.logAnalyticsEvent.body>;
      expectTypeOf<Body['session_id']>().toEqualTypeOf<string | undefined>();
    });
  });
});
