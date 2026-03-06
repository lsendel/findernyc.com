/**
 * main.ts — Client-side analytics and page state
 * Compiled by esbuild: src/assets/js/main.ts → src/assets/js/main.js
 */

import { defaultFeatureFlags, featureFlagKeys, type FeatureFlags } from '../../config/feature-flags';
import {
  normalizeIntakeTeamSize,
  normalizeIntakeUseCase,
  resolveWaitlistRouteAction,
  type IntakeTeamSize,
  type IntakeUseCase,
  type WaitlistFollowUpRoute,
} from './intake-routing';
import { initFaqAccordionController } from './faq-accordion';
import { initLeadCaptureFormController } from './lead-capture-form';
import { initJourneyProgressController } from './journey-progress';
import { initMarketingSnapshotController } from './marketing-snapshot-controller';
import { initMobileNavController } from './mobile-nav';
import { initOnboardingAssistantController } from './onboarding-assistant';
import { initPricingTabsController } from './pricing-tabs';
import { initSectionObserverController } from './section-observer';
import { initCarouselController } from './carousel';
import {
  buildMarketingPlaybookKey,
  readMarketingPlaybookCompletedSteps,
  readMarketingSnapshotPreferences,
  writeMarketingPlaybookCompletedSteps,
  writeMarketingSnapshotPreferences,
} from './marketing-snapshot-state';
import { renderFraudOpsDashboardMetrics, renderFraudReviewQueueList } from './fraud-ops';
import {
  compactInquiryProfileDraft,
  loadInquiryProfile,
  readStoredInquiryProfile,
  writeStoredInquiryProfile,
  type InquiryProfileDraft,
} from './inquiry-profile';
import {
  createOneClickInquiry,
  syncCalendarSchedule,
  type CalendarProvider,
} from './inquiry-scheduling-client';
import {
  requestAccessibilityPreference,
  requestAiConcierge,
  requestAiDocumentHelper,
  requestAiFollowUpApprove,
  requestAiFollowUpAutomation,
  requestAiFollowUpDispatches,
  requestAiFollowUpTemplates,
  requestAiNegotiationPrep,
  requestAiNextBestAction,
  requestAiReviewDecision,
  requestAiReviewQueue,
  requestAiShortlist,
  requestAiSuppressionControls,
  requestExperienceI18n,
  requestUpsertAiSuppressionControls,
  saveAccessibilityPreference,
} from './ai-experience-client';
import {
  generateWebhookNonce,
  requestAssignPartnerRole,
  requestAvailabilitySync,
  requestAvailabilityWebhook,
  requestDeleteUserDashboard,
  requestExperimentRollback,
  requestExperimentStatus,
  requestFraudReviewDecision,
  requestFraudReviewQueue,
  requestInsightsHub,
  requestPartnerPilot,
  requestPartnerPortalConfig,
  requestPartnerRoles,
  requestSaveUserDashboard,
  requestSignedWebhookEvent,
  requestUpdatePartnerPilot,
  requestUpdatePartnerPortalConfig,
  requestUserDashboards,
} from './ops-api-client';
import {
  loadSavedSearches,
  renderSavedSearchDeliveryAttempts,
  requestSavedSearchDeliveryAttempts,
  requestSendSavedSearchAlert,
  saveSearchAlert,
  type SavedSearchItem,
} from './saved-searches';
import {
  formatFilterPresetSummary,
  formatStartHour,
  formatUsd,
  renderAvailabilityLabel,
  renderBestValueLabel,
  renderCommuteLabel,
  renderComparePanel,
  renderFraudRiskLabel,
  renderNeighborhoodFitLabel,
  renderPersonalizationLabel,
  renderReviewAuthenticityLabel,
  renderVerificationLabel,
  titleCase,
} from './smart-search-display';
import { renderListState, setStatusState } from './ui-states';
import {
  createDefaultRuntimeAnalyticsConfig,
  forwardAnalyticsToProviders,
  parseRuntimeAnalyticsConfig,
} from './analytics-runtime';

// ---------------------------------------------------------------------------
// Page State
// ---------------------------------------------------------------------------

export const pageState = {
  dnt: false,
  sectionsViewed: new Set<string>(),
  openFaqIndex: null as number | null,
  activePricingTab: 'consumer' as 'consumer' | 'business',
  navOpen: false,
  carouselIndex: 0,
  carouselTotal: 3,
  sessionId: '',
  featureFlags: { ...defaultFeatureFlags } as FeatureFlags,
  runtimeAnalyticsConfig: createDefaultRuntimeAnalyticsConfig(),
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export type AnalyticsPayload =
  | {
    event_name: 'cta_click';
    properties: { cta_label: string; section: string } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'section_view';
    properties: { section_name: string } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'faq_expand';
    properties: { question_index: number } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'pricing_tab_view';
    properties: { tab_name: 'consumer' | 'business' } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'search_query';
    properties: {
      query_text: string;
      result_count: number;
      borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
      category?: 'music' | 'food' | 'arts' | 'networking' | 'family' | 'wellness';
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'search_result_click';
    properties: {
      query_text: string;
      event_id: string;
      rank_position: number;
      borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
      category?: 'music' | 'food' | 'arts' | 'networking' | 'family' | 'wellness';
      ranking_strategy?: 'baseline' | 'personalized' | 'best_value' | 'personalized_best_value';
      personalization_score?: number;
      best_value_score?: number;
      neighborhood_fit_score?: number;
      neighborhood_fit_band?: 'strong' | 'moderate' | 'weak';
      neighborhood_fit_dominant_vibe?: 'creative' | 'family' | 'foodie' | 'professional' | 'quiet' | 'nightlife' | 'wellness';
      neighborhood_fit_personalized?: boolean;
      verification_status?: 'verified' | 'pending' | 'unverified';
      fraud_risk_score?: number;
      fraud_risk_band?: 'low' | 'medium' | 'high';
      fraud_review_route?: 'allow' | 'review_queue' | 'block';
      review_authenticity_score?: number;
      review_authenticity_band?: 'trusted' | 'mixed' | 'suspicious';
      review_suppressed_count?: number;
      experiment_assignments?: string[];
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'inquiry_started';
    properties: {
      event_id: string;
      inquiry_surface: 'search_result_card' | 'event_detail';
      autofill_available: boolean;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'inquiry_submitted';
    properties: {
      event_id: string;
      inquiry_id: string;
      profile_source: 'saved_profile' | 'manual_input' | 'mixed';
      preferred_contact_channel: 'email' | 'sms' | 'phone';
      auto_schedule_enabled?: boolean;
      seconds_from_search?: number;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'schedule_requested';
    properties: {
      inquiry_id: string;
      event_id: string;
      provider: 'google_calendar' | 'outlook_calendar' | 'apple_calendar';
      start_at: string;
      auto_triggered?: boolean;
      seconds_from_inquiry?: number;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'schedule_conflict';
    properties: {
      inquiry_id: string;
      event_id: string;
      provider: 'google_calendar' | 'outlook_calendar' | 'apple_calendar';
      conflict_count: number;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'schedule_confirmed';
    properties: {
      inquiry_id: string;
      event_id: string;
      provider: 'google_calendar' | 'outlook_calendar' | 'apple_calendar';
      scheduled_id: string;
      delivery: 'stub' | 'queued';
      auto_triggered?: boolean;
      seconds_from_inquiry?: number;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_concierge_prompt';
    properties: {
      query_text: string;
      retrieval_limit: number;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_concierge_response';
    properties: {
      query_text: string;
      citation_count: number;
      prompt_version: string;
      model_version: string;
      fallback_used: boolean;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_shortlist_generated';
    properties: {
      intent: string;
      shortlist_count: number;
      prompt_version: string;
      model_version: string;
      fallback_used: boolean;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_fallback_triggered';
    properties: {
      feature:
        | 'ai_concierge_chat'
        | 'ai_shortlist_builder'
        | 'ai_negotiation_prep_assistant'
        | 'ai_document_helper'
        | 'ai_follow_up_automation'
        | 'ai_next_best_action';
      reason: string;
      prompt_version: string;
      model_version: string;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_negotiation_prep_generated';
    properties: {
      goal_text: string;
      talking_point_count: number;
      prompt_version: string;
      model_version: string;
      fallback_used: boolean;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_document_helper_generated';
    properties: {
      document_length: number;
      checklist_count: number;
      prompt_version: string;
      model_version: string;
      fallback_used: boolean;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_quality_sampled';
    properties: {
      feature: 'ai_concierge_chat' | 'ai_shortlist_builder' | 'ai_negotiation_prep_assistant' | 'ai_document_helper';
      sample_id: string;
      quality_score: number;
      quality_band: 'high' | 'medium' | 'low';
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_quality_review_decision';
    properties: {
      sample_id: string;
      decision: 'approved' | 'needs_revision';
      reviewer?: string;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_follow_up_automation_run';
    properties: {
      template_id: string;
      dispatch_status: 'queued' | 'suppressed';
      suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
      channel?: 'email' | 'sms' | 'push';
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ai_next_best_action_generated';
    properties: {
      action_count: number;
      funnel_stage: 'discovery' | 'consideration' | 'negotiation' | 'ready_to_book' | 'post_inquiry';
      model_version: string;
      suppressed_actions?: number;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'ux_locale_applied';
    properties: {
      requested_locale: string;
      resolved_locale: string;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'accessibility_mode_updated';
    properties: {
      high_contrast: boolean;
      reduced_motion: boolean;
      keyboard_first: boolean;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'insights_hub_view';
    properties: {
      window_days: number;
      trend_direction: 'up' | 'down' | 'flat';
      total_events: number;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'partner_ops_view';
    properties: {
      workspace_id: string;
      active_phase: 'sandbox_validation' | 'staging_dry_run' | 'limited_production' | 'general_availability';
      role_template_count: number;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'onboarding_defaults_applied';
    properties: {
      role: 'consumer' | 'marketer' | 'business';
      apply_mode: 'manual' | 'quick_pack';
      auto_alert_enabled: boolean;
      autofill_lead_enabled: boolean;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'waitlist_route_preview_updated';
    properties: {
      surface: 'landing' | 'contact';
      route: WaitlistFollowUpRoute;
      submit_label: string;
      use_case?: LeadUseCase;
      team_size?: OnboardingTeamSize;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'waitlist_submit_attempted';
    properties: {
      surface: 'landing' | 'contact';
      route: WaitlistFollowUpRoute;
      submit_label: string;
      use_case?: LeadUseCase;
      team_size?: OnboardingTeamSize;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'waitlist_submit_succeeded';
    properties: {
      surface: 'landing' | 'contact';
      route: WaitlistFollowUpRoute;
      submit_label: string;
      use_case?: LeadUseCase;
      team_size?: OnboardingTeamSize;
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'marketing_snapshot_automation_applied';
    properties: {
      surface: 'landing';
      automation_id:
        | 'auto_run_top_opportunity'
        | 'auto_create_saved_alert'
        | 'autofill_intake_profile'
        | 'instant_role_setup'
        | 'auto_schedule_after_inquiry';
      enabled: boolean;
      source: 'manual_click' | 'auto_apply_defaults';
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'marketing_snapshot_playbook_intake_opened';
    properties: {
      surface: 'landing';
      use_case: 'consumer_discovery' | 'business_listing' | 'marketing_analytics' | 'agency_partnership';
      team_size: 'solo' | 'small_2_10' | 'mid_11_50' | 'enterprise_50_plus';
      route: WaitlistFollowUpRoute;
      confidence: 'high' | 'medium' | 'low';
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'marketing_snapshot_playbook_step_updated';
    properties: {
      surface: 'landing';
      playbook_key: string;
      step_index: number;
      completed: boolean;
      route: WaitlistFollowUpRoute;
      confidence: 'high' | 'medium' | 'low';
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'marketing_snapshot_recovery_query_run';
    properties: {
      surface: 'landing';
      recommendation_id: 'ctr_recovery' | 'inquiry_recovery' | 'schedule_recovery' | 'momentum_scale';
      priority: 'high' | 'medium' | 'low';
      query_text: string;
      outcome_confidence: 'high' | 'medium' | 'low';
      source: 'manual_click' | 'auto_run_default';
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'marketing_snapshot_recovery_escalation_run';
    properties: {
      surface: 'landing';
      action_id:
        | 'escalate_metadata_audit'
        | 'escalate_cta_trust'
        | 'escalate_followup_automation'
        | 'codify_recovery_playbook';
      priority: 'high' | 'medium' | 'low';
      query_text: string;
      recovery_confidence: 'high' | 'medium' | 'low';
      source: 'manual_click' | 'auto_run_default';
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'marketing_snapshot_tuning_rule_applied';
    properties: {
      surface: 'landing';
      rule_id:
        | 'tune_auto_run_top_opportunity'
        | 'tune_auto_run_recovery'
        | 'tune_auto_run_escalation'
        | 'tune_auto_apply_recommended';
      setting: boolean;
      confidence: 'high' | 'medium' | 'low';
      source: 'auto_apply_rule' | 'manual_sync';
    } & Record<string, unknown>;
    session_id?: string;
  }
  | {
    event_name: 'contact_form_draft_restored';
    properties: {
      restored_fields: number;
    } & Record<string, unknown>;
    session_id?: string;
  };

type SmartSearchRequest = {
  query: string;
  session_id?: string;
  filters?: {
    borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
    category?: 'music' | 'food' | 'arts' | 'networking' | 'family' | 'wellness';
    max_price?: number;
    starts_before_hour?: number;
    within_walk_minutes?: number;
  };
  commute_profile?: {
    home_borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
    work_borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
    profile_anchor?: 'home' | 'work' | 'balanced';
  };
  neighborhood_profile?: {
    preferred_vibes?: Array<'creative' | 'family' | 'foodie' | 'professional' | 'quiet' | 'nightlife' | 'wellness'>;
    preferred_boroughs?: Array<'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island'>;
    crowd_tolerance?: 'low' | 'medium' | 'high';
    budget_preference?: 'free' | 'value' | 'premium';
  };
  compare_event_ids?: string[];
  limit: number;
};
type SmartSearchFilters = NonNullable<SmartSearchRequest['filters']>;
type SmartSearchCommuteProfile = NonNullable<SmartSearchRequest['commute_profile']>;
type SmartSearchNeighborhoodProfile = NonNullable<SmartSearchRequest['neighborhood_profile']>;
type SmartSearchNeighborhoodVibe = NonNullable<SmartSearchNeighborhoodProfile['preferred_vibes']>[number];

type SmartSearchResult = {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  borough: string;
  category: string;
  price: number;
  start_hour: number;
  walk_minutes: number;
  venue: string;
  relevance_score: number;
  availability?: {
    status: 'available' | 'limited' | 'sold_out';
    seats_total?: number;
    seats_remaining?: number;
    updated_at: string;
  };
  commute?: {
    eta_minutes: number;
    score: number;
    band: 'excellent' | 'good' | 'fair' | 'poor';
    mode: 'walk' | 'subway' | 'multi_leg';
    confidence: 'estimated';
    origin_borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
    profile_anchor?: 'home' | 'work' | 'balanced';
    personalized: boolean;
  };
  neighborhood_fit?: {
    score: number;
    band: 'strong' | 'moderate' | 'weak';
    dominant_vibe: 'creative' | 'family' | 'foodie' | 'professional' | 'quiet' | 'nightlife' | 'wellness';
    reasons: string[];
    personalized: boolean;
  };
  personalization?: {
    score: number;
    boost: number;
    reasons: string[];
    personalized: boolean;
  };
  best_value?: {
    score: number;
    band: 'excellent' | 'good' | 'fair' | 'low';
    factors: {
      relevance: number;
      affordability: number;
      commute: number;
    };
  };
  ranking_strategy?: 'baseline' | 'personalized' | 'best_value' | 'personalized_best_value';
  verification?: {
    status: 'verified' | 'pending' | 'unverified';
    badge_label: string;
    verified_at?: string;
    verification_method?: 'manual' | 'trusted_partner' | 'document_check';
    trust_score: number;
  };
  fraud_risk?: {
    score: number;
    band: 'low' | 'medium' | 'high';
    review_route: 'allow' | 'review_queue' | 'block';
    reasons: string[];
    rules_triggered: string[];
    model_version: string;
  };
  review_authenticity?: {
    score: number;
    band: 'trusted' | 'mixed' | 'suspicious';
    review_count: number;
    visible_review_count: number;
    suppressed_review_count: number;
    suppression_applied: boolean;
    reasons: string[];
  };
  experiment_tags?: string[];
  price_breakdown?: {
    base_price: number;
    service_fee: number;
    tax: number;
    total_price: number;
    currency: 'USD';
    pricing_profile: {
      scope: 'default' | 'organizer';
      organizer_id?: string;
    };
    disclaimer: string;
  };
};

type SmartSearchResponse = {
  success: true;
  results: SmartSearchResult[];
  comparison?: {
    items: Array<{
      id: string;
      title: string;
      borough: string;
      category: string;
      price: number;
      start_hour: number;
      walk_minutes: number;
      relevance_score: number;
      total_price?: number;
      commute_eta_minutes?: number;
      best_value_score?: number;
    }>;
    summary: {
      compared_count: number;
      cheapest_event_id?: string;
      earliest_event_id?: string;
      shortest_walk_event_id?: string;
      top_relevance_event_id?: string;
    };
  };
  experiments?: Array<{
    id: 'ranking_blend_v1' | 'trust_controls_v1';
    variant: 'control' | 'treatment';
    guardrail_status: 'insufficient_sample' | 'healthy' | 'stop_loss_triggered';
    rollback_recommended: boolean;
    min_sample_size: number;
    observed_sample_size: number;
  }>;
  total: number;
};

type SmartSearchFilterPreset = {
  id: string;
  name: string;
  filters: SmartSearchFilters;
};

type FraudOpsDashboardResponse = {
  success: true;
  queue_size: number;
  pending_count: number;
  high_risk_pending_count: number;
  reviewed_count: number;
  false_positive_count: number;
  false_positive_rate: number;
  outcomes: {
    cleared: number;
    confirmed_fraud: number;
    false_positive: number;
  };
};

type FraudReviewDecision = 'cleared' | 'confirmed_fraud' | 'false_positive';
type FraudReviewQueueStatus = 'pending' | FraudReviewDecision;

type FraudReviewQueueItem = {
  event_id: string;
  title: string;
  organizer_id: string;
  risk_score: number;
  risk_band: 'low' | 'medium' | 'high';
  review_route: 'allow' | 'review_queue' | 'block';
  reasons: string[];
  status: FraudReviewQueueStatus;
  reviewer?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type FraudReviewQueueResponse = {
  success: true;
  items: FraudReviewQueueItem[];
};

type FraudReviewDecisionResponse = {
  success: true;
  item: FraudReviewQueueItem;
};

const SMART_SEARCH_FILTER_PRESETS_KEY = 'localgems_smart_search_filter_presets_v1';
const SMART_SEARCH_LAST_REQUEST_KEY = 'localgems_smart_search_last_request_v1';
const SMART_SEARCH_RECENT_QUERIES_KEY = 'localgems_smart_search_recent_queries_v1';
const ONBOARDING_PROFILE_STORAGE_KEY = 'localgems_onboarding_profile_v1';
const ONBOARDING_PREFERENCES_STORAGE_KEY = 'localgems_onboarding_preferences_v1';
const ONBOARDING_AUTO_ALERT_STATE_KEY = 'localgems_onboarding_auto_alert_state_v1';
const JOURNEY_PROGRESS_STORAGE_KEY = 'localgems_journey_progress_v1';
const MARKETING_SNAPSHOT_PREFS_KEY = 'localgems_marketing_snapshot_prefs_v1';
const MARKETING_SNAPSHOT_PLAYBOOK_PROGRESS_KEY = 'localgems_marketing_snapshot_playbook_progress_v1';
const MARKETING_SNAPSHOT_AUTO_ESCALATION_STATE_KEY = 'localgems_marketing_snapshot_auto_escalation_state_v1';
const SMART_SEARCH_MAX_COMPARE_ITEMS = 3;
const SMART_SEARCH_MAX_PRESETS = 8;
const SMART_SEARCH_MAX_RECENT_QUERIES = 5;

type OnboardingRole = 'consumer' | 'marketer' | 'business';
type OnboardingTeamSize = IntakeTeamSize;
type OnboardingProfile = {
  role: OnboardingRole;
  city?: string;
  borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
  team_size?: OnboardingTeamSize;
  updated_at: string;
};

type OnboardingPreferences = {
  auto_alert_enabled: boolean;
  autofill_lead_enabled: boolean;
  updated_at: string;
};

type OnboardingAutoAlertState = {
  fingerprint: string;
  saved_search_id?: number;
  created_at: string;
};

type LeadUseCase = IntakeUseCase;

type JourneyProgress = {
  search_completed_at?: string;
  alert_created_at?: string;
  lead_submitted_at?: string;
  contact_submitted_at?: string;
};

type RecentSmartSearchQuery = {
  query: string;
  created_at: string;
};

type SmartSearchLastRequest = {
  query: string;
  filters: SmartSearchFilters;
  commute_profile?: {
    home_borough?: SmartSearchCommuteProfile['home_borough'];
    work_borough?: SmartSearchCommuteProfile['work_borough'];
    profile_anchor?: SmartSearchCommuteProfile['profile_anchor'];
  };
  neighborhood_profile?: {
    preferred_vibe?: SmartSearchNeighborhoodVibe;
    crowd_tolerance?: SmartSearchNeighborhoodProfile['crowd_tolerance'];
    budget_preference?: SmartSearchNeighborhoodProfile['budget_preference'];
  };
  created_at: string;
};

type AiConciergeResponse = {
  success: true;
  answer: string;
  citations: Array<{
    event_id: string;
    title: string;
    borough: string;
    category: string;
    reason: string;
  }>;
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    fallback_reason?: string;
    retrieval_count: number;
  };
  quality?: {
    rubric: {
      overall_score: number;
      band: 'high' | 'medium' | 'low';
    };
    sampled_for_review: boolean;
    review_sample_id?: string;
    sampling_reason?: 'low_quality' | 'random_sample';
  };
};

type AiShortlistResponse = {
  success: true;
  shortlist: Array<{
    event_id: string;
    title: string;
    borough: string;
    category: string;
    price: number;
    start_hour: number;
    walk_minutes: number;
    score: number;
    rationale: string;
  }>;
  summary: string;
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    fallback_reason?: string;
    retrieval_count: number;
  };
  quality?: {
    rubric: {
      overall_score: number;
      band: 'high' | 'medium' | 'low';
    };
    sampled_for_review: boolean;
    review_sample_id?: string;
    sampling_reason?: 'low_quality' | 'random_sample';
  };
};

type AiNegotiationPrepResponse = {
  success: true;
  summary: string;
  talking_points: string[];
  suggested_concessions: string[];
  red_flags: string[];
  opening_script: string;
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    fallback_reason?: string;
    retrieval_count: number;
  };
  quality?: {
    rubric: {
      overall_score: number;
      band: 'high' | 'medium' | 'low';
    };
    sampled_for_review: boolean;
    review_sample_id?: string;
    sampling_reason?: 'low_quality' | 'random_sample';
  };
};

type AiDocumentHelperResponse = {
  success: true;
  summary: string;
  checklist: Array<{
    item: string;
    status: 'present' | 'missing' | 'unclear';
    evidence?: string;
  }>;
  action_items: string[];
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    fallback_reason?: string;
    retrieval_count: number;
  };
  quality?: {
    rubric: {
      overall_score: number;
      band: 'high' | 'medium' | 'low';
    };
    sampled_for_review: boolean;
    review_sample_id?: string;
    sampling_reason?: 'low_quality' | 'random_sample';
  };
};

type ExperienceI18nResponse = {
  success: true;
  requested_locale?: string;
  resolved_locale: 'en-US' | 'es-US' | 'zh-CN';
  rtl: boolean;
  labels: {
    smart_search_title: string;
    smart_search_subtitle: string;
    borough: string;
    category: string;
    max_price: string;
    starts_before: string;
    walk_distance: string;
    search_button: string;
  };
  taxonomy: {
    categories: Record<'music' | 'food' | 'arts' | 'networking' | 'family' | 'wellness', string>;
    boroughs: Record<'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island', string>;
  };
};

type AccessibilityPreferenceResponse = {
  success: true;
  preference: {
    session_id: string;
    high_contrast: boolean;
    reduced_motion: boolean;
    keyboard_first: boolean;
    updated_at: string;
  };
};

type AiFollowUpTemplateListResponse = {
  success: true;
  items: Array<{
    id: string;
    version: string;
    name: string;
    channel: 'email' | 'sms' | 'push';
    body_template: string;
  }>;
};

type AiFollowUpApproveResponse = {
  success: true;
  approval: {
    recipient_id: string;
    template_id: string;
    template_version: string;
    approved_by?: string;
    approved_at: string;
  };
};

type AiFollowUpAutomationResponse = {
  success: true;
  dispatch: {
    id: string;
    recipient_id: string;
    template_id: string;
    template_version: string;
    channel: 'email' | 'sms' | 'push';
    message: string;
    status: 'queued' | 'suppressed';
    suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
    created_at: string;
  };
  suppression: {
    recipient_id: string;
    quiet_hours_start: number;
    quiet_hours_end: number;
    frequency_cap_per_day: number;
    opt_out: boolean;
    updated_at: string;
  };
};

type AiNextBestActionResponse = {
  success: true;
  summary: string;
  actions: Array<{
    id: 'book_now' | 'schedule_visit' | 'send_inquiry' | 'request_discount' | 'save_alert' | 'ask_follow_up';
    priority: number;
    title: string;
    reason: string;
    suggested_channel: 'email' | 'sms' | 'push';
    suppressed: boolean;
    suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
  }>;
  suppression: {
    recipient_id: string;
    quiet_hours_start: number;
    quiet_hours_end: number;
    frequency_cap_per_day: number;
    opt_out: boolean;
    updated_at: string;
  };
  telemetry: {
    prompt_version: string;
    model_version: string;
    fallback_used: boolean;
    retrieval_count: number;
  };
};

type AiSuppressionControls = {
  recipient_id: string;
  quiet_hours_start: number;
  quiet_hours_end: number;
  frequency_cap_per_day: number;
  opt_out: boolean;
  updated_at: string;
};

type AiSuppressionControlsResponse = {
  success: true;
  controls: AiSuppressionControls;
};

type AiFollowUpDispatchesResponse = {
  success: true;
  items: Array<{
    id: string;
    recipient_id: string;
    template_id: string;
    template_version: string;
    channel: 'email' | 'sms' | 'push';
    message: string;
    status: 'queued' | 'suppressed';
    suppression_reason?: 'opt_out' | 'quiet_hours' | 'frequency_cap';
    created_at: string;
  }>;
};

type AiReviewSampleStatus = 'pending' | 'approved' | 'needs_revision';

type AiReviewQueueItem = {
  id: string;
  feature: 'ai_concierge_chat' | 'ai_shortlist_builder' | 'ai_negotiation_prep_assistant' | 'ai_document_helper';
  output_type: string;
  session_id?: string;
  output_preview: string;
  rubric: {
    scores: Array<{
      category: 'grounding' | 'clarity' | 'actionability' | 'safety';
      score: number;
      rationale: string;
    }>;
    overall_score: number;
    band: 'high' | 'medium' | 'low';
  };
  sampling_reason: 'low_quality' | 'random_sample';
  status: AiReviewSampleStatus;
  reviewer?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type AiReviewQueueResponse = {
  success: true;
  items: AiReviewQueueItem[];
};

type AiReviewDecisionResponse = {
  success: true;
  item: AiReviewQueueItem;
};

type MarketingAutomationId =
  | 'auto_run_top_opportunity'
  | 'auto_create_saved_alert'
  | 'autofill_intake_profile'
  | 'instant_role_setup'
  | 'auto_schedule_after_inquiry';

type InsightsHubResponse = {
  success: true;
  summary: {
    window_days: number;
    total_events: number;
    active_sessions: number;
    trend_direction: 'up' | 'down' | 'flat';
    funnel_health_score: number;
    top_bottleneck_stage: 'discover' | 'convert' | 'schedule' | 'waitlist' | 'balanced';
  };
  top_events: Array<{ event_name: string; count: number }>;
  funnel: {
    searches: number;
    clicks: number;
    inquiries: number;
    schedules: number;
    click_through_rate: number;
    inquiry_rate: number;
    schedule_rate: number;
  };
  waitlist_funnel: {
    preview_updates: number;
    submit_attempts: number;
    submit_successes: number;
    preview_to_submit_rate: number;
    submit_success_rate: number;
    by_surface: {
      landing: {
        preview_updates: number;
        submit_attempts: number;
        submit_successes: number;
      };
      contact: {
        preview_updates: number;
        submit_attempts: number;
        submit_successes: number;
      };
    };
  };
  query_clusters: Array<{
    cluster_key:
      | 'local_discovery'
      | 'budget_friendly'
      | 'family_planning'
      | 'networking_growth'
      | 'music_nightlife'
      | 'food_experiences'
      | 'business_marketing'
      | 'partnership_programs'
      | 'bookable_events'
      | 'general_exploration';
    label: string;
    searches: number;
    clicks: number;
    inquiries: number;
    schedules: number;
    click_through_rate: number;
    inquiry_rate: number;
    schedule_rate: number;
    opportunity_score: number;
    sample_query: string;
    high_intent: boolean;
  }>;
  recommendations: Array<{
    cluster_key:
      | 'local_discovery'
      | 'budget_friendly'
      | 'family_planning'
      | 'networking_growth'
      | 'music_nightlife'
      | 'food_experiences'
      | 'business_marketing'
      | 'partnership_programs'
      | 'bookable_events'
      | 'general_exploration';
    title: string;
    detail: string;
    suggested_query: string;
    focus_stage: 'ctr' | 'inquiry' | 'schedule' | 'scale';
    priority: 'high' | 'medium' | 'low';
  }>;
  funnel_friction_alerts: Array<{
    id:
      | 'ctr_gap'
      | 'inquiry_gap'
      | 'schedule_gap'
      | 'waitlist_preview_gap'
      | 'landing_conversion_gap'
      | 'contact_conversion_gap';
    stage: 'discover' | 'convert' | 'schedule' | 'waitlist';
    severity: 'high' | 'medium' | 'low';
    headline: string;
    detail: string;
    suggested_query: string;
    auto_fix: MarketingAutomationId;
  }>;
  automation_recommendations: Array<{
    id: MarketingAutomationId;
    label: string;
    description: string;
    enabled_by_default: boolean;
    impact: 'acquisition' | 'conversion' | 'retention' | 'operations';
  }>;
  automation_tuning_rules: Array<{
    id:
      | 'tune_auto_run_top_opportunity'
      | 'tune_auto_run_recovery'
      | 'tune_auto_run_escalation'
      | 'tune_auto_apply_recommended';
    setting: boolean;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
    priority: 'high' | 'medium' | 'low';
    cooldown_hours?: 6 | 12 | 24 | 48;
  }>;
  weekly_playbook: {
    title: string;
    primary_goal: string;
    recommended_use_case: 'consumer_discovery' | 'business_listing' | 'marketing_analytics' | 'agency_partnership';
    recommended_team_size: 'solo' | 'small_2_10' | 'mid_11_50' | 'enterprise_50_plus';
    recommended_route: WaitlistFollowUpRoute;
    focus_query: string;
    confidence: 'high' | 'medium' | 'low';
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
    confidence: 'high' | 'medium' | 'low';
  };
  playbook_recovery_recommendations: Array<{
    id: 'ctr_recovery' | 'inquiry_recovery' | 'schedule_recovery' | 'momentum_scale';
    title: string;
    detail: string;
    suggested_query: string;
    priority: 'high' | 'medium' | 'low';
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
    confidence: 'high' | 'medium' | 'low';
  };
  recovery_escalation_actions: Array<{
    id: 'escalate_metadata_audit' | 'escalate_cta_trust' | 'escalate_followup_automation' | 'codify_recovery_playbook';
    title: string;
    detail: string;
    suggested_query: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  recovery_escalation_attribution: {
    total_runs: number;
    manual_runs: number;
    auto_runs: number;
    actions: Array<{
      action_id: 'escalate_metadata_audit' | 'escalate_cta_trust' | 'escalate_followup_automation' | 'codify_recovery_playbook';
      total_runs: number;
      manual_runs: number;
      auto_runs: number;
      sessions_with_run: number;
      last_run_at: string | null;
      success_score: number;
      recommended_mode: 'manual' | 'auto';
    }>;
  };
  daily: Array<{ day: string; searches: number; clicks: number; inquiries: number; schedules: number }>;
};

type UserDashboardMetric =
  | 'search_queries'
  | 'search_clicks'
  | 'inquiries_submitted'
  | 'schedules_confirmed'
  | 'ai_conversions';

type UserDashboardVisualization = 'kpi' | 'line' | 'bar';

type UserDashboardCard = {
  id: string;
  metric: UserDashboardMetric;
  title: string;
  visualization: UserDashboardVisualization;
  window_days: number;
};

type UserDashboardItem = {
  id: string;
  owner_id: string;
  name: string;
  cards: UserDashboardCard[];
  layout: {
    columns: number;
    density: 'comfortable' | 'compact';
  };
  created_at: string;
  updated_at: string;
};

type UserDashboardsListResponse = {
  success: true;
  items: UserDashboardItem[];
};

type UserDashboardsSaveResponse = {
  success: true;
  item: UserDashboardItem;
};

type UserDashboardsDeleteResponse = {
  success: true;
  dashboard_id: string;
};

type ExperimentStatusItem = {
  id: 'ranking_blend_v1' | 'trust_controls_v1';
  name: string;
  status: 'active' | 'paused' | 'rolled_back';
  settings: {
    treatment_share: number;
    min_sample_size: number;
    stop_loss_delta: number;
    forced_variant?: 'control' | 'treatment';
  };
  metrics: {
    control: {
      exposures: number;
      clicks: number;
    };
    treatment: {
      exposures: number;
      clicks: number;
    };
    control_ctr: number;
    treatment_ctr: number;
  };
  guardrail: {
    status: 'insufficient_sample' | 'healthy' | 'stop_loss_triggered';
    rollback_recommended: boolean;
  };
};

type ExperimentStatusResponse = {
  success: true;
  items: ExperimentStatusItem[];
};

type ExperimentRollbackResponse = {
  success: true;
  item: {
    id: 'ranking_blend_v1' | 'trust_controls_v1';
    status: 'active' | 'paused' | 'rolled_back';
  } & Record<string, unknown>;
  reason?: string;
};

type PartnerRolesResponse = {
  success: true;
  workspace_id: string;
  role_templates: PartnerRoleTemplate[];
  assignments: PartnerRoleAssignment[];
};

type PartnerRoleId = 'workspace_admin' | 'ops_manager' | 'analyst' | 'support_agent' | 'viewer';

type PartnerRoleTemplate = {
  id: PartnerRoleId;
  name: string;
  description: string;
  permissions: string[];
};

type PartnerRoleAssignment = {
  workspace_id: string;
  member_id: string;
  role_id: PartnerRoleId;
  assigned_by?: string;
  assigned_at: string;
};

type PartnerAssignRoleResponse = {
  success: true;
  assignment: PartnerRoleAssignment;
  role_templates?: PartnerRoleTemplate[];
};

type PartnerPortalConfig = {
  tenant_id: string;
  brand_name: string;
  theme: {
    primary_color: string;
    accent_color: string;
    logo_url?: string;
  };
  feature_overrides: Record<string, boolean>;
  updated_at: string;
};

type PartnerPortalConfigResponse = {
  success: true;
  config: PartnerPortalConfig;
};

type PartnerPilotPhaseId = 'sandbox_validation' | 'staging_dry_run' | 'limited_production' | 'general_availability';
type PartnerPilotPhaseStatus = 'pending' | 'in_progress' | 'completed';

type PartnerPilotPhase = {
  phase: PartnerPilotPhaseId;
  status: PartnerPilotPhaseStatus;
  checklist: string[];
  updated_at: string;
};

type PartnerPilotResponse = {
  success: true;
  phases: PartnerPilotPhase[];
};

type PartnerPilotUpdateResponse = {
  success: true;
  phase: PartnerPilotPhase;
  phases: PartnerPilotPhase[];
};

type AvailabilityOpsStatus = 'available' | 'limited' | 'sold_out';

type AvailabilityOpsItem = {
  event_id: string;
  status: AvailabilityOpsStatus;
  seats_total?: number;
  seats_remaining?: number;
  updated_at: string;
};

type AvailabilitySyncResponse = {
  success: true;
  processed: number;
  items: AvailabilityOpsItem[];
};

type AvailabilityWebhookResponse = AvailabilitySyncResponse & {
  provider: string;
};

type WebhookOpsSuccessResponse = {
  success: true;
  partner: string;
  delivery_id: string;
  accepted_at: string;
  event: {
    event_id: string;
    event_type: string;
    occurred_at?: string;
    payload: Record<string, unknown>;
  };
  replay_protection: {
    nonce: string;
    max_skew_seconds: number;
  };
};

type WebhookOpsErrorResponse = {
  success: false;
  error: string;
};

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
}

function readOrCreateSessionId(): string {
  if (typeof localStorage === 'undefined') return generateSessionId();

  const storageKey = 'localgems_session_id';
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;

  const created = generateSessionId();
  localStorage.setItem(storageKey, created);
  return created;
}

export async function bootstrapRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch('/api/config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return;

    const payload = await response.json() as {
      feature_flags?: Record<string, unknown>;
      analytics?: unknown;
    };
    const remoteFlags = payload.feature_flags;
    if (remoteFlags && typeof remoteFlags === 'object') {
      for (const key of featureFlagKeys) {
        if (typeof remoteFlags[key] === 'boolean') {
          pageState.featureFlags[key] = remoteFlags[key] as boolean;
        }
      }
    }

    pageState.runtimeAnalyticsConfig = parseRuntimeAnalyticsConfig(payload.analytics);
  } catch {
    // Runtime config is best-effort only.
  }
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return pageState.featureFlags[flag] === true;
}

export function initAnalytics(): void {
  if (navigator.doNotTrack === '1') {
    pageState.dnt = true;
    return;
  }

  pageState.sessionId = readOrCreateSessionId();
}

export async function trackEvent(payload: AnalyticsPayload): Promise<void> {
  if (pageState.dnt) return;

  const normalizedPayload = {
    ...payload,
    session_id: payload.session_id ?? (pageState.sessionId || undefined),
  };

  forwardAnalyticsToProviders(pageState.runtimeAnalyticsConfig, normalizedPayload);

  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload),
    });
  } catch {
    // analytics failure is non-fatal
  }
}

export function trackCTA(label: string, section: string): void {
  trackEvent({
    event_name: 'cta_click',
    properties: { cta_label: label, section },
  });
}

// ---------------------------------------------------------------------------
// CTA click listeners
// ---------------------------------------------------------------------------

export function attachCTAListeners(): void {
  const ctaElements = document.querySelectorAll<HTMLElement>('[data-cta]');
  ctaElements.forEach((el) => {
    el.addEventListener('click', () => {
      trackCTA(el.dataset.cta!, el.dataset.section ?? '');
    });
  });
}

// ---------------------------------------------------------------------------
// Lead Capture Form
// ---------------------------------------------------------------------------

export function initLeadCaptureForm(): void {
  initLeadCaptureFormController({
    readOnboardingPreferences,
    readOnboardingProfile,
    resolveLeadUseCaseFromRole,
    normalizeLeadUseCase,
    normalizeOnboardingTeamSize,
    titleCase,
    trackEvent,
    trackCTA,
    markJourneyProgressStep,
    resolveLeadNextAction,
    resolveLeadNextActionForRoute,
  });
}

export function initOnboardingAssistant(): void {
  initOnboardingAssistantController({
    readOnboardingPreferences,
    writeOnboardingPreferences,
    readOnboardingProfile,
    writeOnboardingProfile,
    resolveOnboardingSearchDefaults,
    writeLastSmartSearchRequest,
    rememberRecentSmartSearchQuery,
    isSavedSearchAlertsEnabled: () => isFeatureEnabled('saved_searches_alerts'),
    buildOnboardingAlertFingerprint,
    readOnboardingAutoAlertState,
    writeOnboardingAutoAlertState,
    saveSearchAlert: (payload) => saveSearchAlert(payload, {
      onCreated: () => {
        markJourneyProgressStep('alert_created_at');
      },
    }),
    sessionId: pageState.sessionId,
    trackEvent,
    normalizeLeadUseCase,
  });
}

export function initJourneyProgress(): void {
  initJourneyProgressController({
    readOnboardingProfile,
    readJourneyProgress,
    readOnboardingAutoAlertState,
    resolveLeadUseCaseFromRole,
    buildContactPrefillHref,
  });
}

// ---------------------------------------------------------------------------
// Section Observer
// ---------------------------------------------------------------------------

export function initSectionObserver(): void {
  initSectionObserverController({
    trackEvent,
    sectionsViewed: pageState.sectionsViewed,
  });
}

// ---------------------------------------------------------------------------
// FAQ Accordion
// ---------------------------------------------------------------------------

export function initFAQ(): void {
  initFaqAccordionController({
    trackEvent,
    setOpenFaqIndex: (index) => {
      pageState.openFaqIndex = index;
    },
    getOpenFaqIndex: () => pageState.openFaqIndex,
  });
}

// ---------------------------------------------------------------------------
// Pricing Tabs
// ---------------------------------------------------------------------------

export function initPricingTabs(): void {
  initPricingTabsController({
    trackEvent,
    setActivePricingTab: (tab) => {
      pageState.activePricingTab = tab;
    },
  });
}

// ---------------------------------------------------------------------------
// Smart Search
// ---------------------------------------------------------------------------

function clearSmartSearchResults(container: HTMLElement): void {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function parseFilterNumber(raw: string | undefined, min: number, max: number): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) return undefined;
  return rounded;
}

function readSmartSearchFilterPresets(): SmartSearchFilterPreset[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SMART_SEARCH_FILTER_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const presets = parsed
      .map((item): SmartSearchFilterPreset | null => {
        if (!item || typeof item !== 'object') return null;
        const rawPreset = item as Record<string, unknown>;
        if (typeof rawPreset.id !== 'string' || typeof rawPreset.name !== 'string') return null;
        const filtersRaw = rawPreset.filters;
        if (!filtersRaw || typeof filtersRaw !== 'object') return null;
        const filtersRecord = filtersRaw as Record<string, unknown>;
        const filters: SmartSearchFilters = {
          ...(typeof filtersRecord.borough === 'string' ? { borough: filtersRecord.borough as SmartSearchFilters['borough'] } : {}),
          ...(typeof filtersRecord.category === 'string' ? { category: filtersRecord.category as SmartSearchFilters['category'] } : {}),
          ...(typeof filtersRecord.max_price === 'number' ? { max_price: filtersRecord.max_price } : {}),
          ...(typeof filtersRecord.starts_before_hour === 'number' ? { starts_before_hour: filtersRecord.starts_before_hour } : {}),
          ...(typeof filtersRecord.within_walk_minutes === 'number'
            ? { within_walk_minutes: filtersRecord.within_walk_minutes }
            : {}),
        };
        return {
          id: rawPreset.id,
          name: rawPreset.name.slice(0, 30),
          filters,
        };
      })
      .filter((preset): preset is SmartSearchFilterPreset => Boolean(preset));
    return presets.slice(0, SMART_SEARCH_MAX_PRESETS);
  } catch {
    return [];
  }
}

function writeSmartSearchFilterPresets(presets: SmartSearchFilterPreset[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SMART_SEARCH_FILTER_PRESETS_KEY, JSON.stringify(presets.slice(0, SMART_SEARCH_MAX_PRESETS)));
  } catch {
    // best effort only
  }
}

function readRecentSmartSearchQueries(): RecentSmartSearchQuery[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SMART_SEARCH_RECENT_QUERIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): RecentSmartSearchQuery | null => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        if (typeof record.query !== 'string' || typeof record.created_at !== 'string') return null;
        const query = record.query.trim();
        if (!query) return null;
        return {
          query,
          created_at: record.created_at,
        };
      })
      .filter((item): item is RecentSmartSearchQuery => Boolean(item))
      .slice(0, SMART_SEARCH_MAX_RECENT_QUERIES);
  } catch {
    return [];
  }
}

function writeRecentSmartSearchQueries(items: RecentSmartSearchQuery[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SMART_SEARCH_RECENT_QUERIES_KEY, JSON.stringify(items.slice(0, SMART_SEARCH_MAX_RECENT_QUERIES)));
  } catch {
    // best effort only
  }
}

function rememberRecentSmartSearchQuery(query: string): RecentSmartSearchQuery[] {
  const normalized = query.trim();
  if (!normalized) return readRecentSmartSearchQueries();
  const nextItem: RecentSmartSearchQuery = {
    query: normalized,
    created_at: new Date().toISOString(),
  };
  const deduped = readRecentSmartSearchQueries().filter(
    (item) => item.query.toLowerCase() !== normalized.toLowerCase(),
  );
  const next = [nextItem, ...deduped].slice(0, SMART_SEARCH_MAX_RECENT_QUERIES);
  writeRecentSmartSearchQueries(next);
  return next;
}

function readLastSmartSearchRequest(): SmartSearchLastRequest | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SMART_SEARCH_LAST_REQUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.query !== 'string') return null;
    const query = record.query.trim();
    if (!query) return null;
    const filtersRaw = (record.filters && typeof record.filters === 'object')
      ? (record.filters as Record<string, unknown>)
      : {};
    const filters: SmartSearchFilters = {
      ...(typeof filtersRaw.borough === 'string' ? { borough: filtersRaw.borough as SmartSearchFilters['borough'] } : {}),
      ...(typeof filtersRaw.category === 'string' ? { category: filtersRaw.category as SmartSearchFilters['category'] } : {}),
      ...(typeof filtersRaw.max_price === 'number' ? { max_price: filtersRaw.max_price } : {}),
      ...(typeof filtersRaw.starts_before_hour === 'number' ? { starts_before_hour: filtersRaw.starts_before_hour } : {}),
      ...(typeof filtersRaw.within_walk_minutes === 'number' ? { within_walk_minutes: filtersRaw.within_walk_minutes } : {}),
    };
    const commuteRaw = (record.commute_profile && typeof record.commute_profile === 'object')
      ? (record.commute_profile as Record<string, unknown>)
      : {};
    const neighborhoodRaw = (record.neighborhood_profile && typeof record.neighborhood_profile === 'object')
      ? (record.neighborhood_profile as Record<string, unknown>)
      : {};
    return {
      query,
      filters,
      commute_profile: {
        ...(typeof commuteRaw.home_borough === 'string'
          ? { home_borough: commuteRaw.home_borough as SmartSearchCommuteProfile['home_borough'] }
          : {}),
        ...(typeof commuteRaw.work_borough === 'string'
          ? { work_borough: commuteRaw.work_borough as SmartSearchCommuteProfile['work_borough'] }
          : {}),
        ...(commuteRaw.profile_anchor === 'home' || commuteRaw.profile_anchor === 'work' || commuteRaw.profile_anchor === 'balanced'
          ? { profile_anchor: commuteRaw.profile_anchor }
          : {}),
      },
      neighborhood_profile: {
        ...(typeof neighborhoodRaw.preferred_vibe === 'string'
          ? { preferred_vibe: neighborhoodRaw.preferred_vibe as SmartSearchNeighborhoodVibe }
          : {}),
        ...(neighborhoodRaw.crowd_tolerance === 'low' || neighborhoodRaw.crowd_tolerance === 'medium' || neighborhoodRaw.crowd_tolerance === 'high'
          ? { crowd_tolerance: neighborhoodRaw.crowd_tolerance }
          : {}),
        ...(neighborhoodRaw.budget_preference === 'free'
          || neighborhoodRaw.budget_preference === 'value'
          || neighborhoodRaw.budget_preference === 'premium'
          ? { budget_preference: neighborhoodRaw.budget_preference }
          : {}),
      },
      created_at: typeof record.created_at === 'string' ? record.created_at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeLastSmartSearchRequest(input: SmartSearchLastRequest): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SMART_SEARCH_LAST_REQUEST_KEY, JSON.stringify(input));
  } catch {
    // best effort only
  }
}

function readOnboardingProfile(): OnboardingProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    const role = record.role;
    if (role !== 'consumer' && role !== 'marketer' && role !== 'business') return null;
    const profile: OnboardingProfile = {
      role,
      updated_at: typeof record.updated_at === 'string' ? record.updated_at : new Date().toISOString(),
    };
    if (typeof record.city === 'string' && record.city.trim()) {
      profile.city = record.city.trim();
    }
    if (
      record.borough === 'manhattan'
      || record.borough === 'brooklyn'
      || record.borough === 'queens'
      || record.borough === 'bronx'
      || record.borough === 'staten_island'
    ) {
      profile.borough = record.borough;
    }
    if (
      record.team_size === 'solo'
      || record.team_size === 'small_2_10'
      || record.team_size === 'mid_11_50'
      || record.team_size === 'enterprise_50_plus'
    ) {
      profile.team_size = record.team_size;
    }
    return profile;
  } catch {
    return null;
  }
}

function writeOnboardingProfile(profile: OnboardingProfile): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // best effort only
  }
}

function resolveLeadUseCaseFromRole(role: OnboardingRole): LeadUseCase {
  if (role === 'marketer') return 'marketing_analytics';
  if (role === 'business') return 'business_listing';
  return 'consumer_discovery';
}

function normalizeLeadUseCase(value: string | null | undefined): LeadUseCase | undefined {
  return normalizeIntakeUseCase(value);
}

function normalizeOnboardingTeamSize(value: string | null | undefined): OnboardingTeamSize | undefined {
  return normalizeIntakeTeamSize(value);
}

function readOnboardingPreferences(): OnboardingPreferences {
  if (typeof localStorage === 'undefined') {
    return {
      auto_alert_enabled: true,
      autofill_lead_enabled: true,
      updated_at: new Date().toISOString(),
    };
  }
  try {
    const raw = localStorage.getItem(ONBOARDING_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return {
        auto_alert_enabled: true,
        autofill_lead_enabled: true,
        updated_at: new Date().toISOString(),
      };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {
        auto_alert_enabled: true,
        autofill_lead_enabled: true,
        updated_at: new Date().toISOString(),
      };
    }
    const record = parsed as Record<string, unknown>;
    return {
      auto_alert_enabled: record.auto_alert_enabled !== false,
      autofill_lead_enabled: record.autofill_lead_enabled !== false,
      updated_at: typeof record.updated_at === 'string' ? record.updated_at : new Date().toISOString(),
    };
  } catch {
    return {
      auto_alert_enabled: true,
      autofill_lead_enabled: true,
      updated_at: new Date().toISOString(),
    };
  }
}

function writeOnboardingPreferences(preferences: OnboardingPreferences): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // best effort only
  }
}

function buildOnboardingAlertFingerprint(role: OnboardingRole, request: SmartSearchLastRequest): string {
  return [
    role,
    request.query.trim().toLowerCase(),
    request.filters.borough ?? '',
    request.filters.category ?? '',
  ].join('|');
}

function readOnboardingAutoAlertState(): OnboardingAutoAlertState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_AUTO_ALERT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.fingerprint !== 'string' || typeof record.created_at !== 'string') return null;
    return {
      fingerprint: record.fingerprint,
      ...(typeof record.saved_search_id === 'number' ? { saved_search_id: record.saved_search_id } : {}),
      created_at: record.created_at,
    };
  } catch {
    return null;
  }
}

function writeOnboardingAutoAlertState(state: OnboardingAutoAlertState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_AUTO_ALERT_STATE_KEY, JSON.stringify(state));
  } catch {
    // best effort only
  }
}

function readJourneyProgress(): JourneyProgress {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(JOURNEY_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const record = parsed as Record<string, unknown>;
    const progress: JourneyProgress = {};
    if (typeof record.search_completed_at === 'string') progress.search_completed_at = record.search_completed_at;
    if (typeof record.alert_created_at === 'string') progress.alert_created_at = record.alert_created_at;
    if (typeof record.lead_submitted_at === 'string') progress.lead_submitted_at = record.lead_submitted_at;
    if (typeof record.contact_submitted_at === 'string') progress.contact_submitted_at = record.contact_submitted_at;
    return progress;
  } catch {
    return {};
  }
}

function writeJourneyProgress(progress: JourneyProgress): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(JOURNEY_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // best effort only
  }
}

function markJourneyProgressStep(step: keyof JourneyProgress): void {
  const next = {
    ...readJourneyProgress(),
    [step]: new Date().toISOString(),
  };
  writeJourneyProgress(next);
  window.dispatchEvent(new Event('localgems:journey-update'));
}

function buildContactPrefillHref(input: {
  use_case?: LeadUseCase;
  team_size?: OnboardingTeamSize;
  city?: string;
  goal?: string;
  route_hint?: WaitlistFollowUpRoute;
  confidence?: 'high' | 'medium' | 'low';
  rationale?: string;
}): string {
  const params = new URLSearchParams();
  if (input.use_case) params.set('use_case', input.use_case);
  if (input.team_size) params.set('team_size', input.team_size);
  if (input.city) params.set('city', input.city);
  if (input.goal) params.set('goal', input.goal);
  if (input.route_hint) params.set('route_hint', input.route_hint);
  if (input.confidence) params.set('confidence', input.confidence);
  if (input.rationale) params.set('rationale', input.rationale.slice(0, 180));
  const query = params.toString();
  return query ? `/contact?${query}` : '/contact';
}

function resolveLeadNextAction(input: {
  use_case?: LeadUseCase;
  team_size?: OnboardingTeamSize;
  city?: string;
}): { label: string; href: string } {
  const useCase = input.use_case;
  if (useCase === 'consumer_discovery') {
    return {
      label: 'Run Smart Search',
      href: '/#smart-search',
    };
  }
  if (useCase === 'business_listing') {
    return {
      label: 'Open Business Intake',
      href: buildContactPrefillHref({
        use_case: useCase,
        team_size: input.team_size,
        city: input.city,
        goal: 'Improve listing visibility and conversion',
      }),
    };
  }
  if (useCase === 'agency_partnership') {
    return {
      label: 'Open Partnership Program',
      href: '/partnership',
    };
  }
  return {
    label: 'Open Marketing Intake',
    href: buildContactPrefillHref({
      use_case: 'marketing_analytics',
      team_size: input.team_size,
      city: input.city,
      goal: 'Improve ranking, CTR, and inquiry conversion',
    }),
  };
}

function resolveLeadNextActionForRoute(
  route: WaitlistFollowUpRoute,
  fallback: {
    use_case?: LeadUseCase;
    team_size?: OnboardingTeamSize;
    city?: string;
  },
): { label: string; href: string } {
  const action = resolveWaitlistRouteAction(route);
  if (route === 'community_waitlist') {
    return resolveLeadNextAction(fallback);
  }
  return {
    label: action.routeLabel,
    href: action.routeHref,
  };
}

function resolveOnboardingSearchDefaults(
  role: OnboardingRole,
  borough?: OnboardingProfile['borough'],
): {
  query: string;
  category?: SmartSearchFilters['category'];
  max_price?: number;
  starts_before_hour?: number;
  within_walk_minutes?: number;
  borough?: SmartSearchFilters['borough'];
} {
  if (role === 'marketer') {
    return {
      query: 'local marketing networking events and audience growth',
      category: 'networking',
      max_price: 120,
      starts_before_hour: 21,
      within_walk_minutes: 40,
      ...(borough ? { borough } : {}),
    };
  }
  if (role === 'business') {
    return {
      query: 'business listing opportunities and local promotion events',
      category: 'networking',
      max_price: 150,
      starts_before_hour: 22,
      within_walk_minutes: 35,
      ...(borough ? { borough } : {}),
    };
  }
  return {
    query: 'free live music and hidden local events tonight',
    category: 'music',
    max_price: 40,
    starts_before_hour: 23,
    within_walk_minutes: 20,
    ...(borough ? { borough } : {}),
  };
}

function renderRecentSmartSearchQueries(
  container: HTMLElement,
  items: RecentSmartSearchQuery[],
  onRunQuery: (query: string) => void,
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (items.length === 0) return;

  for (const item of items) {
    const row = document.createElement('li');
    row.className = 'smart-search-recent-item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'smart-search-recent-btn';
    button.textContent = item.query;
    button.setAttribute('aria-label', `Run recent search: ${item.query}`);
    button.addEventListener('click', () => {
      onRunQuery(item.query);
    });

    row.appendChild(button);
    container.appendChild(row);
  }
}

function renderActiveFilterChips(
  container: HTMLElement,
  filters: SmartSearchFilters,
  onRemove: (key: keyof SmartSearchFilters) => void,
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  const chips: Array<{ key: keyof SmartSearchFilters; label: string }> = [];
  if (filters.borough) chips.push({ key: 'borough', label: `Borough: ${titleCase(filters.borough)}` });
  if (filters.category) chips.push({ key: 'category', label: `Category: ${titleCase(filters.category)}` });
  if (typeof filters.max_price === 'number') chips.push({ key: 'max_price', label: `Max $${filters.max_price}` });
  if (typeof filters.starts_before_hour === 'number') {
    chips.push({ key: 'starts_before_hour', label: `Before ${formatStartHour(filters.starts_before_hour)}` });
  }
  if (typeof filters.within_walk_minutes === 'number') {
    chips.push({ key: 'within_walk_minutes', label: `Walk ≤ ${filters.within_walk_minutes}m` });
  }

  if (chips.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'smart-search-result-meta';
    empty.textContent = 'No active filters. Add filters using the controls above.';
    container.appendChild(empty);
    return;
  }

  for (const chip of chips) {
    const chipEl = document.createElement('span');
    chipEl.className = 'smart-search-filter-chip';
    chipEl.textContent = chip.label;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', `Remove ${chip.label}`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      onRemove(chip.key);
    });
    chipEl.appendChild(removeBtn);
    container.appendChild(chipEl);
  }
}

function renderFilterPresetList(
  container: HTMLElement,
  presets: SmartSearchFilterPreset[],
  callbacks: {
    onApply: (preset: SmartSearchFilterPreset) => void;
    onDelete: (presetId: string) => void;
  },
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (presets.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'smart-search-result-meta';
    empty.textContent = 'No presets saved yet.';
    container.appendChild(empty);
    return;
  }

  for (const preset of presets) {
    const li = document.createElement('li');
    li.className = 'smart-search-filter-preset';

    const label = document.createElement('span');
    label.className = 'smart-search-filter-preset-label';
    label.textContent = `${preset.name}: ${formatFilterPresetSummary(preset.filters)}`;

    const actions = document.createElement('div');
    actions.className = 'smart-search-filter-preset-actions';

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'smart-search-filter-preset-btn';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => {
      callbacks.onApply(preset);
    });
    actions.appendChild(applyBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'smart-search-filter-preset-btn smart-search-filter-preset-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      callbacks.onDelete(preset.id);
    });
    actions.appendChild(deleteBtn);

    li.appendChild(label);
    li.appendChild(actions);
    container.appendChild(li);
  }
}

function renderSmartSearchResults(
  container: HTMLElement,
  results: SmartSearchResult[],
  context: {
    query_text: string;
    filters: SmartSearchFilters;
    experiment_assignments: string[];
    alerts_enabled: boolean;
    status: HTMLElement;
    refreshSavedSearches: () => Promise<void>;
    compare_enabled: boolean;
    is_compared: (eventId: string) => boolean;
    toggle_compare: (event: SmartSearchResult) => void;
    one_click_enabled: boolean;
    scheduling_enabled: boolean;
    on_create_inquiry: (event: SmartSearchResult) => Promise<void>;
    on_schedule_inquiry: (event: SmartSearchResult) => Promise<void>;
  },
): void {
  clearSmartSearchResults(container);

  for (const [index, item] of results.entries()) {
    const li = document.createElement('li');
    li.className = 'smart-search-result';

    const title = document.createElement('h3');
    title.textContent = item.title;

    const meta = document.createElement('p');
    meta.className = 'smart-search-result-meta';
    const priceText = item.price === 0 ? 'Free' : `$${item.price}`;
    meta.textContent = `${titleCase(item.borough)} • ${titleCase(item.category)} • ${priceText} • ${formatStartHour(item.start_hour)} • ${item.walk_minutes} min walk`;

    let verificationEl: HTMLElement | null = null;
    const verificationLabel = renderVerificationLabel(item);
    if (verificationLabel) {
      verificationEl = document.createElement('p');
      verificationEl.className = `smart-search-verification smart-search-verification-${item.verification!.status}`;
      verificationEl.textContent = verificationLabel;
    }

    let priceBreakdownEl: HTMLElement | null = null;
    if (item.price_breakdown && item.price_breakdown.total_price >= item.price_breakdown.base_price) {
      priceBreakdownEl = document.createElement('p');
      priceBreakdownEl.className = 'smart-search-price-breakdown';
      priceBreakdownEl.textContent = `Est. total ${formatUsd(item.price_breakdown.total_price)} (${formatUsd(item.price_breakdown.base_price)} + ${formatUsd(item.price_breakdown.service_fee)} fees + ${formatUsd(item.price_breakdown.tax)} tax)`;
    }

    let commuteEl: HTMLElement | null = null;
    const commuteLabel = renderCommuteLabel(item);
    if (commuteLabel) {
      commuteEl = document.createElement('p');
      commuteEl.className = `smart-search-commute smart-search-commute-${item.commute!.band}`;
      commuteEl.textContent = commuteLabel;
    }

    let neighborhoodFitEl: HTMLElement | null = null;
    const neighborhoodFitLabel = renderNeighborhoodFitLabel(item);
    if (neighborhoodFitLabel) {
      neighborhoodFitEl = document.createElement('p');
      neighborhoodFitEl.className = `smart-search-neighborhood-fit smart-search-neighborhood-fit-${item.neighborhood_fit!.band}`;
      const reasonText = item.neighborhood_fit!.reasons.length > 0
        ? ` — ${item.neighborhood_fit!.reasons.join(' ')}`
        : '';
      neighborhoodFitEl.textContent = `${neighborhoodFitLabel}${reasonText}`;
    }

    let bestValueEl: HTMLElement | null = null;
    const bestValueLabel = renderBestValueLabel(item);
    if (bestValueLabel) {
      bestValueEl = document.createElement('p');
      bestValueEl.className = `smart-search-best-value smart-search-best-value-${item.best_value!.band}`;
      bestValueEl.textContent = bestValueLabel;
    }

    let personalizationEl: HTMLElement | null = null;
    const personalizationLabel = renderPersonalizationLabel(item);
    if (personalizationLabel) {
      personalizationEl = document.createElement('p');
      personalizationEl.className = 'smart-search-personalization';
      const reasonText = item.personalization!.reasons.length > 0
        ? ` — ${item.personalization!.reasons.join(' ')}`
        : '';
      personalizationEl.textContent = `${personalizationLabel}${reasonText}`;
    }

    let fraudRiskEl: HTMLElement | null = null;
    const fraudRiskLabel = renderFraudRiskLabel(item);
    if (fraudRiskLabel) {
      fraudRiskEl = document.createElement('p');
      fraudRiskEl.className = `smart-search-fraud-risk smart-search-fraud-risk-${item.fraud_risk!.band}`;
      fraudRiskEl.textContent = fraudRiskLabel;
    }

    let reviewAuthenticityEl: HTMLElement | null = null;
    const reviewAuthenticityLabel = renderReviewAuthenticityLabel(item);
    if (reviewAuthenticityLabel) {
      reviewAuthenticityEl = document.createElement('p');
      reviewAuthenticityEl.className = `smart-search-review-authenticity smart-search-review-authenticity-${item.review_authenticity!.band}`;
      reviewAuthenticityEl.textContent = reviewAuthenticityLabel;
    }

    const availabilityLabel = renderAvailabilityLabel(item);
    let availabilityEl: HTMLElement | null = null;
    if (availabilityLabel) {
      availabilityEl = document.createElement('p');
      availabilityEl.className = `smart-search-availability smart-search-availability-${item.availability!.status}`;
      availabilityEl.textContent = availabilityLabel;
    }

    const desc = document.createElement('p');
    desc.className = 'smart-search-result-desc';
    desc.textContent = item.description;

    const actions = document.createElement('div');
    actions.className = 'smart-search-result-actions';

    if (context.alerts_enabled) {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'btn btn-outline tap-target smart-search-result-action';
      action.textContent = 'Create Alert';
      action.addEventListener('click', () => {
        trackCTA('save-search-alert', 'smart-search');
        void saveSearchAlert({
          query_text: context.query_text,
          filters: {
            ...(context.filters.borough ? { borough: context.filters.borough } : {}),
            ...(context.filters.category ? { category: context.filters.category } : {}),
          },
          session_id: pageState.sessionId || undefined,
        }, {
          onCreated: () => {
            markJourneyProgressStep('alert_created_at');
          },
        }).then((saved) => {
          if (!saved) {
            context.status.textContent = 'Unable to save alert right now.';
            return;
          }
          context.status.textContent = 'Saved alert. We will notify you when new matches appear.';
          void context.refreshSavedSearches();
        });
      });
      actions.appendChild(action);
    }

    const trackResultClick = (): void => {
      void trackEvent({
        event_name: 'search_result_click',
        properties: {
          query_text: context.query_text,
          event_id: item.id,
          rank_position: index + 1,
          ...(context.filters.borough ? { borough: context.filters.borough } : {}),
          ...(context.filters.category ? { category: context.filters.category } : {}),
          ...(item.ranking_strategy ? { ranking_strategy: item.ranking_strategy } : {}),
          ...(item.personalization ? { personalization_score: item.personalization.score } : {}),
          ...(item.best_value ? { best_value_score: item.best_value.score } : {}),
          ...(item.neighborhood_fit
            ? {
              neighborhood_fit_score: item.neighborhood_fit.score,
              neighborhood_fit_band: item.neighborhood_fit.band,
              neighborhood_fit_dominant_vibe: item.neighborhood_fit.dominant_vibe,
              neighborhood_fit_personalized: item.neighborhood_fit.personalized,
            }
            : {}),
          ...(item.verification ? { verification_status: item.verification.status } : {}),
          ...(item.fraud_risk
            ? {
              fraud_risk_score: item.fraud_risk.score,
              fraud_risk_band: item.fraud_risk.band,
              fraud_review_route: item.fraud_risk.review_route,
            }
            : {}),
          ...(item.review_authenticity
            ? {
              review_authenticity_score: item.review_authenticity.score,
              review_authenticity_band: item.review_authenticity.band,
              review_suppressed_count: item.review_authenticity.suppressed_review_count,
            }
            : {}),
          ...(context.experiment_assignments.length > 0
            ? { experiment_assignments: context.experiment_assignments }
            : {}),
        },
      });
    };

    if (context.one_click_enabled) {
      const inquiryAction = document.createElement('button');
      inquiryAction.type = 'button';
      inquiryAction.className = 'btn btn-primary tap-target smart-search-result-action';
      inquiryAction.textContent = 'Start Inquiry';
      inquiryAction.addEventListener('click', () => {
        trackResultClick();
        void context.on_create_inquiry(item);
      });
      actions.appendChild(inquiryAction);
    }

    if (context.scheduling_enabled) {
      const scheduleAction = document.createElement('button');
      scheduleAction.type = 'button';
      scheduleAction.className = 'btn btn-outline tap-target smart-search-result-action';
      scheduleAction.textContent = 'Schedule In App';
      scheduleAction.addEventListener('click', () => {
        void context.on_schedule_inquiry(item);
      });
      actions.appendChild(scheduleAction);
    }

    const detailAction = document.createElement('a');
    detailAction.href = '#sign-up';
    detailAction.className = 'btn btn-outline tap-target smart-search-result-action';
    detailAction.textContent = context.one_click_enabled ? 'Save This Event' : 'Save and Join Waitlist';
    detailAction.addEventListener('click', trackResultClick);
    actions.appendChild(detailAction);

    let compareAction: HTMLButtonElement | null = null;
    if (context.compare_enabled) {
      compareAction = document.createElement('button');
      compareAction.type = 'button';
      compareAction.className = 'btn btn-outline tap-target smart-search-result-action';
      compareAction.textContent = context.is_compared(item.id) ? 'Remove From Compare' : 'Add To Compare';
      compareAction.addEventListener('click', () => {
        context.toggle_compare(item);
      });
    }
    if (compareAction) actions.appendChild(compareAction);

    li.appendChild(title);
    li.appendChild(meta);
    if (verificationEl) li.appendChild(verificationEl);
    if (priceBreakdownEl) li.appendChild(priceBreakdownEl);
    if (commuteEl) li.appendChild(commuteEl);
    if (neighborhoodFitEl) li.appendChild(neighborhoodFitEl);
    if (bestValueEl) li.appendChild(bestValueEl);
    if (personalizationEl) li.appendChild(personalizationEl);
    if (fraudRiskEl) li.appendChild(fraudRiskEl);
    if (reviewAuthenticityEl) li.appendChild(reviewAuthenticityEl);
    if (availabilityEl) li.appendChild(availabilityEl);
    li.appendChild(desc);
    li.appendChild(actions);
    container.appendChild(li);
  }
}

function renderAiConciergeCitations(container: HTMLElement, citations: AiConciergeResponse['citations']): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (citations.length === 0) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = 'No grounded citations returned for this prompt.';
    container.appendChild(item);
    return;
  }

  for (const citation of citations) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = `${citation.title} (${titleCase(citation.borough)} • ${titleCase(citation.category)}) — ${citation.reason}`;
    container.appendChild(item);
  }
}

function renderAiShortlist(container: HTMLElement, shortlist: AiShortlistResponse['shortlist']): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (shortlist.length === 0) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = 'No shortlist candidates found for this intent.';
    container.appendChild(item);
    return;
  }

  for (const candidate of shortlist) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    const priceLabel = candidate.price <= 0 ? 'Free' : `$${candidate.price}`;
    item.textContent = `${candidate.title} • ${titleCase(candidate.borough)} • ${priceLabel} • score ${candidate.score} — ${candidate.rationale}`;
    container.appendChild(item);
  }
}

function renderAiNegotiationPoints(
  container: HTMLElement,
  input: { talking_points: string[]; suggested_concessions: string[]; red_flags: string[] },
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  const sections: Array<{ title: string; items: string[] }> = [
    { title: 'Talking points', items: input.talking_points },
    { title: 'Suggested concessions', items: input.suggested_concessions },
    { title: 'Red flags', items: input.red_flags },
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;
    const heading = document.createElement('li');
    heading.className = 'saved-search-item';
    heading.textContent = `${section.title}:`;
    container.appendChild(heading);
    for (const value of section.items) {
      const item = document.createElement('li');
      item.className = 'saved-search-item';
      item.textContent = `- ${value}`;
      container.appendChild(item);
    }
  }
}

function renderAiDocumentChecklist(
  container: HTMLElement,
  checklist: AiDocumentHelperResponse['checklist'],
  action_items: string[],
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  for (const entry of checklist) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = `${entry.item}: ${entry.status}${entry.evidence ? ` (${entry.evidence})` : ''}`;
    container.appendChild(item);
  }
  for (const action of action_items) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = `Action: ${action}`;
    container.appendChild(item);
  }
}

function renderAiNextBestActions(
  container: HTMLElement,
  actions: AiNextBestActionResponse['actions'],
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (actions.length === 0) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = 'No actions generated.';
    container.appendChild(item);
    return;
  }

  for (const action of actions) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    const suppression = action.suppressed ? ` (suppressed: ${action.suppression_reason ?? 'unknown'})` : '';
    item.textContent = `${action.title} [${action.suggested_channel}] — ${action.reason}${suppression}`;
    container.appendChild(item);
  }
}

function renderAiFollowUpDispatches(
  container: HTMLElement,
  dispatches: AiFollowUpDispatchesResponse['items'],
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (dispatches.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'saved-search-item';
    empty.textContent = 'No dispatches for this recipient yet.';
    container.appendChild(empty);
    return;
  }

  for (const dispatch of dispatches) {
    const row = document.createElement('li');
    row.className = 'saved-search-item';
    const suppressed = dispatch.status === 'suppressed'
      ? ` (suppressed: ${dispatch.suppression_reason ?? 'unknown'})`
      : '';
    row.textContent = `${dispatch.created_at} • ${dispatch.recipient_id} • ${dispatch.template_id}@${dispatch.template_version} • ${dispatch.channel} • ${dispatch.status}${suppressed}`;
    container.appendChild(row);
  }
}

function renderAiReviewQueue(
  container: HTMLElement,
  items: AiReviewQueueItem[],
  handlers: {
    onDecision: (sample_id: string, decision: 'approved' | 'needs_revision') => void;
  },
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'saved-search-item';
    empty.textContent = 'No AI review samples for this filter.';
    container.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement('li');
    row.className = 'saved-search-item dashboard-manager-item';

    const details = document.createElement('span');
    details.className = 'dashboard-manager-item-meta';
    details.textContent = `${item.feature} • ${item.output_type} • score ${item.rubric.overall_score} (${item.rubric.band}) • reason ${item.sampling_reason} • status ${item.status}`;

    const actions = document.createElement('div');
    actions.className = 'dashboard-manager-actions';
    const previewText = document.createElement('span');
    previewText.className = 'dashboard-manager-item-meta';
    previewText.hidden = true;
    previewText.textContent = item.output_preview;

    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'btn btn-outline tap-target';
    preview.textContent = 'Preview';
    preview.addEventListener('click', () => {
      previewText.hidden = !previewText.hidden;
      preview.textContent = previewText.hidden ? 'Preview' : 'Hide preview';
    });
    actions.appendChild(preview);

    for (const decision of ['approved', 'needs_revision'] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline tap-target';
      button.textContent = decision.replaceAll('_', ' ');
      button.disabled = item.status === decision;
      button.addEventListener('click', () => {
        handlers.onDecision(item.id, decision);
      });
      actions.appendChild(button);
    }

    row.appendChild(details);
    row.appendChild(actions);
    row.appendChild(previewText);
    container.appendChild(row);
  }
}

function renderInsightsHubSummary(
  container: HTMLElement,
  payload: InsightsHubResponse,
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  const lines = [
    `Window: ${payload.summary.window_days} days`,
    `Total events: ${payload.summary.total_events}`,
    `Active sessions: ${payload.summary.active_sessions}`,
    `Trend direction: ${payload.summary.trend_direction}`,
    `Funnel health score: ${payload.summary.funnel_health_score}/100`,
    `Top bottleneck: ${payload.summary.top_bottleneck_stage}`,
    `Funnel searches/clicks/inquiries/schedules: ${payload.funnel.searches}/${payload.funnel.clicks}/${payload.funnel.inquiries}/${payload.funnel.schedules}`,
    `CTR: ${(payload.funnel.click_through_rate * 100).toFixed(1)}%`,
    `Inquiry rate: ${(payload.funnel.inquiry_rate * 100).toFixed(1)}%`,
    `Schedule rate: ${(payload.funnel.schedule_rate * 100).toFixed(1)}%`,
    `Top events: ${payload.top_events.slice(0, 3).map((item) => `${item.event_name} (${item.count})`).join(', ') || 'none'}`,
  ];

  for (const line of lines) {
    const metric = document.createElement('div');
    metric.className = 'fraud-ops-metric';
    metric.textContent = line;
    container.appendChild(metric);
  }
}

function renderMarketingSnapshotCards(
  input: {
    ctr: HTMLElement;
    inquiry_rate: HTMLElement;
    schedule_rate: HTMLElement;
    ranking_opportunity: HTMLElement;
    window: HTMLElement;
    top_events: HTMLElement;
    actions: HTMLElement;
    alerts: HTMLElement;
    automations: HTMLElement;
    tuning_rules: HTMLElement;
    automation_state: HTMLElement;
    playbook: HTMLElement;
    playbook_progress: HTMLElement;
    playbook_recovery: HTMLElement;
    recovery_impact: HTMLElement;
    intake_link: HTMLAnchorElement;
    waitlist_funnel: HTMLElement;
    status: HTMLElement;
  },
  handlers: {
    onRunQuery: (query: string) => void;
    onRunRecoveryQuery: (input: {
      recommendation_id: 'ctr_recovery' | 'inquiry_recovery' | 'schedule_recovery' | 'momentum_scale';
      priority: 'high' | 'medium' | 'low';
      query_text: string;
      outcome_confidence: 'high' | 'medium' | 'low';
      source: 'manual_click' | 'auto_run_default';
    }) => void;
    onRunRecoveryEscalation: (input: {
      action_id: 'escalate_metadata_audit' | 'escalate_cta_trust' | 'escalate_followup_automation' | 'codify_recovery_playbook';
      priority: 'high' | 'medium' | 'low';
      query_text: string;
      recovery_confidence: 'high' | 'medium' | 'low';
      source: 'manual_click' | 'auto_run_default';
    }) => void;
    onApplyAutomation: (id: MarketingAutomationId, source: 'manual_click' | 'auto_apply_defaults') => void;
    isAutomationEnabled: (id: MarketingAutomationId) => boolean;
  },
  payload: InsightsHubResponse | null,
): void {
  while (input.top_events.firstChild) input.top_events.removeChild(input.top_events.firstChild);
  while (input.actions.firstChild) input.actions.removeChild(input.actions.firstChild);
  while (input.alerts.firstChild) input.alerts.removeChild(input.alerts.firstChild);
  while (input.automations.firstChild) input.automations.removeChild(input.automations.firstChild);
  while (input.tuning_rules.firstChild) input.tuning_rules.removeChild(input.tuning_rules.firstChild);
  while (input.automation_state.firstChild) input.automation_state.removeChild(input.automation_state.firstChild);
  while (input.playbook.firstChild) input.playbook.removeChild(input.playbook.firstChild);
  while (input.playbook_recovery.firstChild) input.playbook_recovery.removeChild(input.playbook_recovery.firstChild);
  while (input.recovery_impact.firstChild) input.recovery_impact.removeChild(input.recovery_impact.firstChild);
  while (input.waitlist_funnel.firstChild) input.waitlist_funnel.removeChild(input.waitlist_funnel.firstChild);

  const renderActionItem = (params: {
    label: string;
    detail: string;
    query?: string;
  }): void => {
    const row = document.createElement('li');
    row.className = 'saved-search-item dashboard-manager-item marketing-snapshot-opportunity';

    const meta = document.createElement('span');
    meta.className = 'dashboard-manager-item-meta';
    meta.textContent = `${params.label} • ${params.detail}`;
    row.appendChild(meta);

    if (params.query) {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'btn btn-outline tap-target';
      action.textContent = 'Run Query';
      action.addEventListener('click', () => {
        handlers.onRunQuery(params.query!);
      });
      row.appendChild(action);
    }

    input.actions.appendChild(row);
  };

  const renderAlertItem = (params: {
    severity: 'high' | 'medium' | 'low';
    headline: string;
    detail: string;
    suggested_query: string;
    auto_fix: MarketingAutomationId;
  }): void => {
    const row = document.createElement('li');
    row.className = `saved-search-item dashboard-manager-item marketing-snapshot-opportunity marketing-snapshot-alert marketing-snapshot-alert-${params.severity}`;

    const meta = document.createElement('span');
    meta.className = 'dashboard-manager-item-meta';
    meta.textContent = `${params.severity.toUpperCase()} • ${params.headline} • ${params.detail}`;
    row.appendChild(meta);

    const runQuery = document.createElement('button');
    runQuery.type = 'button';
    runQuery.className = 'btn btn-outline tap-target';
    runQuery.textContent = 'Run Query';
    runQuery.addEventListener('click', () => {
      handlers.onRunQuery(params.suggested_query);
    });
    row.appendChild(runQuery);

    const applyFix = document.createElement('button');
    applyFix.type = 'button';
    applyFix.className = 'btn btn-outline tap-target';
    applyFix.textContent = 'Apply Fix';
    const alertFixEnabled = handlers.isAutomationEnabled(params.auto_fix);
    if (alertFixEnabled) {
      applyFix.textContent = 'Applied';
      applyFix.disabled = true;
    }
    applyFix.addEventListener('click', () => {
      handlers.onApplyAutomation(params.auto_fix, 'manual_click');
    });
    row.appendChild(applyFix);

    input.alerts.appendChild(row);
  };

  const renderAutomationItem = (params: {
    id: MarketingAutomationId;
    label: string;
    description: string;
    enabled_by_default: boolean;
    impact: 'acquisition' | 'conversion' | 'retention' | 'operations';
  }): void => {
    const row = document.createElement('li');
    row.className = 'saved-search-item dashboard-manager-item marketing-snapshot-opportunity';

    const meta = document.createElement('span');
    meta.className = 'dashboard-manager-item-meta';
    meta.textContent = `${params.impact.toUpperCase()} • ${params.label} • ${params.description} • default ${params.enabled_by_default ? 'ON' : 'OFF'}`;
    row.appendChild(meta);

    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'btn btn-outline tap-target';
    const alreadyEnabled = handlers.isAutomationEnabled(params.id);
    apply.textContent = alreadyEnabled ? 'Enabled' : 'Enable';
    apply.disabled = alreadyEnabled;
    apply.addEventListener('click', () => {
      handlers.onApplyAutomation(params.id, 'manual_click');
    });
    row.appendChild(apply);

    input.automations.appendChild(row);
  };

  if (!payload) {
    input.ctr.textContent = 'n/a';
    input.inquiry_rate.textContent = 'n/a';
    input.schedule_rate.textContent = 'n/a';
    input.ranking_opportunity.textContent = 'n/a';
    input.window.textContent = 'Window: unavailable';
    renderListState(input.top_events, 'No marketing metrics available yet.', 'warning');
    renderActionItem({
      label: 'Collect baseline data',
      detail: 'Run Smart Search and generate first conversion metrics for this week.',
      query: 'local events near me this week',
    });
    renderListState(input.alerts, 'Funnel friction alerts will appear after baseline traffic is available.', 'warning');
    renderListState(input.automations, 'Automation recommendations will appear after baseline traffic is available.', 'warning');
    renderListState(input.tuning_rules, 'Automation tuning rules will appear after baseline and recovery data is available.', 'warning');
    renderListState(input.automation_state, 'Automation execution diagnostics will appear after baseline traffic is available.', 'warning');
    renderListState(input.playbook, 'Weekly execution playbook will appear after baseline traffic is available.', 'warning');
    renderListState(input.playbook_recovery, 'Outcome recovery actions will appear after playbook comparison data is available.', 'warning');
    renderListState(input.recovery_impact, 'Recovery impact and escalation actions will appear after recovery runs are recorded.', 'warning');
    input.playbook_progress.textContent = 'Playbook progress: unavailable';
    input.intake_link.hidden = true;
    renderListState(input.waitlist_funnel, 'No waitlist funnel metrics available yet.', 'warning');
    setStatusState(input.status, 'Marketing metrics are not available yet.', 'warning');
    return;
  }

  const ctr = `${(payload.funnel.click_through_rate * 100).toFixed(1)}%`;
  const inquiryRate = `${(payload.funnel.inquiry_rate * 100).toFixed(1)}%`;
  const scheduleRate = `${(payload.funnel.schedule_rate * 100).toFixed(1)}%`;
  const topCluster = payload.query_clusters[0];
  const rankingOpportunity = topCluster
    ? `${Math.round(topCluster.opportunity_score)} score (${topCluster.label})`
    : 'Strong alignment';

  input.ctr.textContent = ctr;
  input.inquiry_rate.textContent = inquiryRate;
  input.schedule_rate.textContent = scheduleRate;
  input.ranking_opportunity.textContent = rankingOpportunity;
  input.window.textContent = `Window: ${payload.summary.window_days} days • sessions ${payload.summary.active_sessions} • health ${payload.summary.funnel_health_score}/100 • bottleneck ${payload.summary.top_bottleneck_stage}`;

  const topClusters = payload.query_clusters.slice(0, 5);
  if (topClusters.length === 0) {
    renderListState(input.top_events, 'No query cluster opportunities yet.', 'idle');
  } else {
    for (const cluster of topClusters) {
      const row = document.createElement('li');
      row.className = 'saved-search-item dashboard-manager-item marketing-snapshot-opportunity';
      const meta = document.createElement('span');
      meta.className = 'dashboard-manager-item-meta';
      meta.textContent = `${cluster.label} • searches ${cluster.searches} • CTR ${(cluster.click_through_rate * 100).toFixed(1)}% • inquiry ${(cluster.inquiry_rate * 100).toFixed(1)}%`;
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'btn btn-outline tap-target';
      action.textContent = 'Run Query';
      action.addEventListener('click', () => {
        handlers.onRunQuery(cluster.sample_query);
      });
      row.appendChild(meta);
      row.appendChild(action);
      input.top_events.appendChild(row);
    }
  }

  for (const recommendation of payload.recommendations) {
    renderActionItem({
      label: `${recommendation.priority.toUpperCase()} • ${recommendation.title}`,
      detail: recommendation.detail,
      query: recommendation.suggested_query,
    });
  }

  if (payload.recommendations.length === 0) {
    if (payload.funnel.click_through_rate < 0.1) {
      renderActionItem({
        label: 'Increase CTR',
        detail: 'Titles and snippets are not converting. Prioritize stronger intent keywords.',
        query: 'best free events this week',
      });
    }
    if (payload.funnel.inquiry_rate < 0.2) {
      renderActionItem({
        label: 'Improve inquiry conversion',
        detail: 'Landing intent is weak after click. Tighten CTA copy and add trust proof.',
        query: 'bookable local events this weekend',
      });
    }
    if (payload.funnel.schedule_rate < 0.35) {
      renderActionItem({
        label: 'Lift schedule confirmations',
        detail: 'Users start inquiries but do not schedule. Optimize timing and follow-up cadence.',
        query: 'events with flexible booking times',
      });
    }
    if (payload.summary.trend_direction === 'down') {
      renderActionItem({
        label: 'Recover downward trend',
        detail: 'Traffic is cooling. Refresh high-performing pages and republish top opportunities.',
        query: topClusters[0]?.sample_query ?? 'top local events near me',
      });
    }
  }
  if (!input.actions.firstChild) {
    renderActionItem({
      label: 'Maintain momentum',
      detail: 'Current funnel is healthy. Keep iterating on top query opportunities.',
      query: topClusters[0]?.sample_query ?? 'high intent local events',
    });
  }

  if (payload.funnel_friction_alerts.length === 0) {
    renderListState(input.alerts, 'No urgent friction alerts in the current window.', 'idle');
  } else {
    for (const alert of payload.funnel_friction_alerts) {
      renderAlertItem({
        severity: alert.severity,
        headline: alert.headline,
        detail: alert.detail,
        suggested_query: alert.suggested_query,
        auto_fix: alert.auto_fix,
      });
    }
  }

  if (payload.automation_recommendations.length === 0) {
    renderListState(input.automations, 'No automation recommendations for this window.', 'idle');
  } else {
    for (const automation of payload.automation_recommendations) {
      renderAutomationItem({
        id: automation.id,
        label: automation.label,
        description: automation.description,
        enabled_by_default: automation.enabled_by_default,
        impact: automation.impact,
      });
    }
  }

  if (payload.automation_tuning_rules.length === 0) {
    renderListState(input.tuning_rules, 'No automation tuning rules for this window.', 'idle');
  } else {
    for (const rule of payload.automation_tuning_rules) {
      const item = document.createElement('li');
      item.className = 'saved-search-item';
      const settingLabel = rule.setting ? 'ON' : 'OFF';
      const cooldownLabel = typeof rule.cooldown_hours === 'number' ? ` • cooldown ${rule.cooldown_hours}h` : '';
      item.textContent = `${rule.priority.toUpperCase()} • ${rule.id.replaceAll('_', ' ')} -> ${settingLabel} (${rule.confidence} confidence)${cooldownLabel}. ${rule.reason}`;
      input.tuning_rules.appendChild(item);
    }
  }

  const playbook = payload.weekly_playbook;
  const playbookKey = buildMarketingPlaybookKey(playbook);
  const completedSteps = readMarketingPlaybookCompletedSteps(
    MARKETING_SNAPSHOT_PLAYBOOK_PROGRESS_KEY,
    playbookKey,
    playbook.steps.length,
  );
  const outcomeDelta = payload.playbook_outcome_delta;
  const formatDeltaPercentPoints = (value: number): string => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`;
  let outcomeSummary = 'Outcome delta: unavailable until at least one playbook step is completed.';
  if (outcomeDelta.completion_started_at && !outcomeDelta.has_comparison) {
    outcomeSummary = `Outcome delta: collecting baseline/follow-up data (${outcomeDelta.confidence} confidence).`;
  }
  if (outcomeDelta.has_comparison) {
    outcomeSummary = `Outcome delta (CTR/Inq/Schedule): ${formatDeltaPercentPoints(outcomeDelta.click_through_rate_delta)} / ${formatDeltaPercentPoints(outcomeDelta.inquiry_rate_delta)} / ${formatDeltaPercentPoints(outcomeDelta.schedule_rate_delta)} (${outcomeDelta.confidence} confidence).`;
  }
  const playbookLines = [
    `Title: ${playbook.title}`,
    `Goal: ${playbook.primary_goal}`,
    `Focus query: ${playbook.focus_query}`,
    `Route: ${playbook.recommended_route.replaceAll('_', ' ')}`,
    `Confidence: ${playbook.confidence}`,
    `Confidence note: ${playbook.confidence_reason}`,
    `Route rationale: ${playbook.route_rationale}`,
    `Execution adoption: ${(payload.playbook_execution.adoption_rate * 100).toFixed(1)}% (${payload.playbook_execution.sessions_with_completion} session(s))`,
    outcomeSummary,
    `Outcome sample sizes (baseline/follow-up searches): ${outcomeDelta.baseline_searches}/${outcomeDelta.followup_searches}`,
    `Manual review required: ${playbook.requires_manual_review ? 'yes' : 'no'}`,
  ];
  for (const line of playbookLines) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = line;
    input.playbook.appendChild(item);
  }
  for (const [index, assumption] of playbook.assumptions.entries()) {
    const item = document.createElement('li');
    item.className = 'saved-search-item marketing-snapshot-playbook-assumption';
    item.textContent = `Assumption ${index + 1}: ${assumption}`;
    input.playbook.appendChild(item);
  }
  for (const [index, step] of playbook.steps.entries()) {
    const item = document.createElement('li');
    const isComplete = completedSteps.has(index);
    item.className = `saved-search-item dashboard-manager-item marketing-snapshot-playbook-step${isComplete ? ' is-complete' : ''}`;
    const meta = document.createElement('span');
    meta.className = 'dashboard-manager-item-meta';
    meta.textContent = `Step ${index + 1}: ${step}`;
    item.appendChild(meta);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn btn-outline tap-target';
    toggle.textContent = isComplete ? 'Completed' : 'Mark Complete';
    toggle.addEventListener('click', () => {
      const next = readMarketingPlaybookCompletedSteps(
        MARKETING_SNAPSHOT_PLAYBOOK_PROGRESS_KEY,
        playbookKey,
        playbook.steps.length,
      );
      let completed = false;
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        completed = true;
      }
      writeMarketingPlaybookCompletedSteps(
        MARKETING_SNAPSHOT_PLAYBOOK_PROGRESS_KEY,
        playbookKey,
        next,
      );
      void trackEvent({
        event_name: 'marketing_snapshot_playbook_step_updated',
        properties: {
          surface: 'landing',
          playbook_key: playbookKey,
          step_index: index,
          completed,
          route: playbook.recommended_route,
          confidence: playbook.confidence,
        },
      });
      renderMarketingSnapshotCards(input, handlers, payload);
    });
    item.appendChild(toggle);
    input.playbook.appendChild(item);
  }
  input.playbook_progress.textContent = `Playbook progress: ${completedSteps.size}/${playbook.steps.length} step(s) completed in this browser.`;
  if (payload.playbook_recovery_recommendations.length === 0) {
    const idleMessage = outcomeDelta.has_comparison
      ? 'No urgent recovery actions. Current outcome deltas are stable.'
      : 'Recovery actions will appear once baseline and follow-up outcome windows are available.';
    renderListState(input.playbook_recovery, idleMessage, 'idle');
  } else {
    for (const recommendation of payload.playbook_recovery_recommendations) {
      const item = document.createElement('li');
      item.className = 'saved-search-item dashboard-manager-item marketing-snapshot-opportunity';
      const meta = document.createElement('span');
      meta.className = 'dashboard-manager-item-meta';
      meta.textContent = `${recommendation.priority.toUpperCase()} • ${recommendation.title} • ${recommendation.detail}`;
      item.appendChild(meta);

      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'btn btn-outline tap-target';
      action.textContent = 'Run Recovery Query';
      action.addEventListener('click', () => {
        handlers.onRunRecoveryQuery({
          recommendation_id: recommendation.id,
          priority: recommendation.priority,
          query_text: recommendation.suggested_query,
          outcome_confidence: outcomeDelta.confidence,
          source: 'manual_click',
        });
      });
      item.appendChild(action);
      input.playbook_recovery.appendChild(item);
    }
  }
  const recoveryOutcome = payload.recovery_outcome_delta;
  const recoverySummaryLines = [
    `Recovery runs: ${recoveryOutcome.total_runs} (${recoveryOutcome.sessions_with_run} session(s))`,
    `Recovery sample sizes (baseline/follow-up searches): ${recoveryOutcome.baseline_searches}/${recoveryOutcome.followup_searches}`,
  ];
  for (const line of recoverySummaryLines) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = line;
    input.recovery_impact.appendChild(item);
  }
  const escalationAttribution = payload.recovery_escalation_attribution;
  const escalationAttributionSummary = document.createElement('li');
  escalationAttributionSummary.className = 'saved-search-item';
  escalationAttributionSummary.textContent = `Escalation runs (manual/auto): ${escalationAttribution.manual_runs}/${escalationAttribution.auto_runs} (${escalationAttribution.total_runs} total).`;
  input.recovery_impact.appendChild(escalationAttributionSummary);
  for (const attribution of escalationAttribution.actions.slice(0, 3)) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = `Attribution • ${attribution.action_id.replaceAll('_', ' ')}: runs ${attribution.total_runs} (${attribution.manual_runs} manual / ${attribution.auto_runs} auto) • sessions ${attribution.sessions_with_run} • success ${attribution.success_score}/100 • mode ${attribution.recommended_mode}.`;
    input.recovery_impact.appendChild(item);
  }
  const recoveryOutcomeMessage = recoveryOutcome.recovery_started_at === null
    ? 'Recovery outcome: unavailable until at least one recovery query is run.'
    : !recoveryOutcome.has_comparison
      ? `Recovery outcome: collecting baseline/follow-up data (${recoveryOutcome.confidence} confidence).`
      : `Recovery delta (CTR/Inq/Schedule): ${formatDeltaPercentPoints(recoveryOutcome.click_through_rate_delta)} / ${formatDeltaPercentPoints(recoveryOutcome.inquiry_rate_delta)} / ${formatDeltaPercentPoints(recoveryOutcome.schedule_rate_delta)} (${recoveryOutcome.confidence} confidence).`;
  const recoveryOutcomeItem = document.createElement('li');
  recoveryOutcomeItem.className = 'saved-search-item';
  recoveryOutcomeItem.textContent = recoveryOutcomeMessage;
  input.recovery_impact.appendChild(recoveryOutcomeItem);
  if (payload.recovery_escalation_actions.length === 0) {
    const idle = document.createElement('li');
    idle.className = 'saved-search-item ui-list-state ui-list-state-idle';
    idle.textContent = recoveryOutcome.has_comparison
      ? 'No escalation required. Recovery signals are stable.'
      : 'Escalation actions will appear once recovery comparison windows are available.';
    input.recovery_impact.appendChild(idle);
  } else {
    for (const action of payload.recovery_escalation_actions) {
      const item = document.createElement('li');
      item.className = 'saved-search-item dashboard-manager-item marketing-snapshot-opportunity';
      const meta = document.createElement('span');
      meta.className = 'dashboard-manager-item-meta';
      meta.textContent = `${action.priority.toUpperCase()} • ${action.title} • ${action.detail}`;
      item.appendChild(meta);

      const run = document.createElement('button');
      run.type = 'button';
      run.className = 'btn btn-outline tap-target';
      run.textContent = 'Run Escalation Query';
      run.addEventListener('click', () => {
        handlers.onRunRecoveryEscalation({
          action_id: action.id,
          priority: action.priority,
          query_text: action.suggested_query,
          recovery_confidence: recoveryOutcome.confidence,
          source: 'manual_click',
        });
      });
      item.appendChild(run);
      input.recovery_impact.appendChild(item);
    }
  }
  const onboardingProfile = readOnboardingProfile();
  const intakeHref = buildContactPrefillHref({
    use_case: playbook.recommended_use_case,
    team_size: playbook.recommended_team_size,
    city: onboardingProfile?.city,
    goal: playbook.primary_goal,
    route_hint: playbook.recommended_route,
    confidence: playbook.confidence,
    rationale: playbook.route_rationale,
  });
  input.intake_link.href = intakeHref;
  input.intake_link.textContent = playbook.requires_manual_review
    ? `Review Assumptions & Open Intake (${playbook.recommended_route.replaceAll('_', ' ')})`
    : `Open Prefilled Intake (${playbook.recommended_route.replaceAll('_', ' ')})`;
  input.intake_link.dataset.playbookUseCase = playbook.recommended_use_case;
  input.intake_link.dataset.playbookTeamSize = playbook.recommended_team_size;
  input.intake_link.dataset.playbookRoute = playbook.recommended_route;
  input.intake_link.dataset.playbookConfidence = playbook.confidence;
  input.intake_link.dataset.playbookManualReview = playbook.requires_manual_review ? 'true' : 'false';
  input.intake_link.hidden = false;

  const waitlistLines = [
    `Preview updates: ${payload.waitlist_funnel.preview_updates}`,
    `Submit attempts: ${payload.waitlist_funnel.submit_attempts}`,
    `Submit successes: ${payload.waitlist_funnel.submit_successes}`,
    `Preview -> Submit: ${(payload.waitlist_funnel.preview_to_submit_rate * 100).toFixed(1)}%`,
    `Submit success rate: ${(payload.waitlist_funnel.submit_success_rate * 100).toFixed(1)}%`,
    `Landing flow: ${payload.waitlist_funnel.by_surface.landing.preview_updates}/${payload.waitlist_funnel.by_surface.landing.submit_attempts}/${payload.waitlist_funnel.by_surface.landing.submit_successes}`,
    `Contact flow: ${payload.waitlist_funnel.by_surface.contact.preview_updates}/${payload.waitlist_funnel.by_surface.contact.submit_attempts}/${payload.waitlist_funnel.by_surface.contact.submit_successes}`,
  ];
  for (const line of waitlistLines) {
    const item = document.createElement('li');
    item.className = 'saved-search-item';
    item.textContent = line;
    input.waitlist_funnel.appendChild(item);
  }

  const statusMessage = `Updated from ${payload.summary.total_events} events (${payload.summary.trend_direction} trend, ${payload.recommendations.length} recommendation(s)).`;
  if (playbook.requires_manual_review) {
    setStatusState(
      input.status,
      `${statusMessage} Playbook confidence is low, so verify assumptions before launching intake.`,
      'warning',
    );
  } else {
    setStatusState(input.status, statusMessage, 'success');
  }
}

export function initMarketingSnapshot(): void {
  initMarketingSnapshotController({
    preferences_storage_key: MARKETING_SNAPSHOT_PREFS_KEY,
    readMarketingSnapshotPreferences,
    writeMarketingSnapshotPreferences,
    requestInsightsHub,
    renderMarketingSnapshotCards,
    trackCTA,
    trackEvent,
    setStatusState,
  });
}

function renderUserDashboardsList(
  container: HTMLElement,
  items: UserDashboardItem[],
  handlers: {
    onDelete: (dashboard_id: string) => void;
  },
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'saved-search-item';
    empty.textContent = 'No dashboards saved for this owner.';
    container.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement('li');
    row.className = 'saved-search-item dashboard-manager-item';

    const meta = document.createElement('span');
    meta.className = 'dashboard-manager-item-meta';
    meta.textContent = `${item.name} • ${item.cards.length} card(s) • updated ${new Date(item.updated_at).toLocaleString()}`;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-outline tap-target dashboard-manager-item-delete';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      handlers.onDelete(item.id);
    });

    row.appendChild(meta);
    row.appendChild(remove);
    container.appendChild(row);
  }
}

function renderExperimentSummary(
  container: HTMLElement,
  items: ExperimentStatusItem[],
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fraud-ops-metric';
    empty.textContent = 'No experiments configured.';
    container.appendChild(empty);
    return;
  }

  for (const item of items) {
    const summary = document.createElement('div');
    summary.className = 'fraud-ops-metric';
    summary.textContent = `${item.name}: ${item.status} • guardrail ${item.guardrail.status} • rollback recommended ${item.guardrail.rollback_recommended ? 'yes' : 'no'} • CTR ${item.metrics.control_ctr.toFixed(3)} → ${item.metrics.treatment_ctr.toFixed(3)}`;
    container.appendChild(summary);
  }
}

function renderPartnerOpsSummary(
  container: HTMLElement,
  input: {
    roles: PartnerRolesResponse;
    pilot: PartnerPilotResponse;
    portal: PartnerPortalConfig;
  },
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  const activePhase = input.pilot.phases.find((phase) => phase.status === 'in_progress') ?? input.pilot.phases[0];
  const lines = [
    `Workspace: ${input.roles.workspace_id}`,
    `Tenant: ${input.portal.tenant_id}`,
    `Brand: ${input.portal.brand_name}`,
    `Role templates: ${input.roles.role_templates.length}`,
    `Role assignments: ${input.roles.assignments.length}`,
    `Current rollout phase: ${activePhase?.phase ?? 'n/a'}`,
    `Current phase status: ${activePhase?.status ?? 'n/a'}`,
    `Theme colors: ${input.portal.theme.primary_color} / ${input.portal.theme.accent_color}`,
  ];
  for (const line of lines) {
    const metric = document.createElement('div');
    metric.className = 'fraud-ops-metric';
    metric.textContent = line;
    container.appendChild(metric);
  }
}

function renderPartnerAssignments(
  container: HTMLElement,
  assignments: PartnerRoleAssignment[],
  templates: PartnerRoleTemplate[],
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (assignments.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'saved-search-item';
    empty.textContent = 'No role assignments yet for this workspace.';
    container.appendChild(empty);
    return;
  }

  const roleNameById = new Map(templates.map((template) => [template.id, template.name] as const));
  for (const assignment of assignments) {
    const row = document.createElement('li');
    row.className = 'saved-search-item';
    const roleName = roleNameById.get(assignment.role_id) ?? assignment.role_id;
    row.textContent = `${assignment.member_id} → ${roleName} (${assignment.role_id}) • assigned ${new Date(assignment.assigned_at).toLocaleString()}${assignment.assigned_by ? ` by ${assignment.assigned_by}` : ''}`;
    container.appendChild(row);
  }
}

function renderPartnerPortalConfig(
  container: HTMLElement,
  config: PartnerPortalConfig | null,
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (!config) {
    const empty = document.createElement('div');
    empty.className = 'fraud-ops-metric';
    empty.textContent = 'No portal config loaded yet.';
    container.appendChild(empty);
    return;
  }

  const pre = document.createElement('pre');
  pre.className = 'webhook-ops-response-json';
  pre.textContent = JSON.stringify(config, null, 2);
  container.appendChild(pre);
}

function renderAvailabilityOpsResponse(
  container: HTMLElement,
  payload: AvailabilitySyncResponse | AvailabilityWebhookResponse | { success: false; error: string } | null,
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (!payload) {
    const empty = document.createElement('div');
    empty.className = 'fraud-ops-metric';
    empty.textContent = 'No availability sync response yet.';
    container.appendChild(empty);
    return;
  }

  if ('success' in payload && !payload.success) {
    const error = document.createElement('div');
    error.className = 'fraud-ops-metric';
    error.textContent = `Error: ${payload.error}`;
    container.appendChild(error);
    return;
  }

  const header = document.createElement('div');
  header.className = 'fraud-ops-metric';
  header.textContent = `Processed ${payload.processed} update(s)${'provider' in payload ? ` via ${payload.provider}` : ''}.`;
  container.appendChild(header);

  for (const item of payload.items) {
    const row = document.createElement('div');
    row.className = 'fraud-ops-metric';
    const seatsTotal = typeof item.seats_total === 'number' ? item.seats_total : 'n/a';
    const seatsRemaining = typeof item.seats_remaining === 'number' ? item.seats_remaining : 'n/a';
    row.textContent = `${item.event_id}: ${item.status} • seats ${seatsRemaining}/${seatsTotal} • ${new Date(item.updated_at).toLocaleString()}`;
    container.appendChild(row);
  }
}

function renderWebhookOpsResponse(
  container: HTMLElement,
  payload: WebhookOpsSuccessResponse | WebhookOpsErrorResponse | null,
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (!payload) {
    const empty = document.createElement('div');
    empty.className = 'fraud-ops-metric';
    empty.textContent = 'No webhook response yet.';
    container.appendChild(empty);
    return;
  }

  const pre = document.createElement('pre');
  pre.className = 'webhook-ops-response-json';
  pre.textContent = JSON.stringify(payload, null, 2);
  container.appendChild(pre);
}

function resolveScheduleWindow(dateInput?: string, timeInput?: string): { start_at: string; end_at: string } {
  const now = new Date();
  const fallbackDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const year = fallbackDate.getFullYear();
  const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
  const day = String(fallbackDate.getDate()).padStart(2, '0');
  const safeDate = dateInput?.trim() || `${year}-${month}-${day}`;
  const safeTime = timeInput?.trim() || '18:00';
  const startLocal = new Date(`${safeDate}T${safeTime}:00`);
  const start = Number.isFinite(startLocal.getTime()) ? startLocal : fallbackDate;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  };
}

export function initSmartSearch(): void {
  const section = document.getElementById('smart-search') as HTMLElement | null;
  const form = document.getElementById('smart-search-form') as HTMLFormElement | null;
  const status = document.getElementById('smart-search-status') as HTMLElement | null;
  const results = document.getElementById('smart-search-results') as HTMLElement | null;
  const savedPanel = document.getElementById('saved-searches-panel') as HTMLElement | null;
  const savedList = document.getElementById('saved-searches-list') as HTMLElement | null;
  const savedSearchAlertOpsStatus = document.getElementById('saved-search-alert-ops-status') as HTMLElement | null;
  const savedSearchAlertAttempts = document.getElementById('saved-search-alert-attempts') as HTMLElement | null;
  const filterBuilder = document.getElementById('smart-search-filter-builder') as HTMLElement | null;
  const filterChipList = document.getElementById('smart-search-filter-chip-list') as HTMLElement | null;
  const clearFiltersBtn = document.getElementById('smart-search-clear-filters') as HTMLButtonElement | null;
  const presetNameInput = document.getElementById('smart-search-preset-name') as HTMLInputElement | null;
  const savePresetBtn = document.getElementById('smart-search-save-preset') as HTMLButtonElement | null;
  const presetList = document.getElementById('smart-search-filter-presets') as HTMLElement | null;
  const comparePanel = document.getElementById('smart-search-compare-panel') as HTMLElement | null;
  const compareSummary = document.getElementById('smart-search-compare-summary') as HTMLElement | null;
  const compareGrid = document.getElementById('smart-search-compare-grid') as HTMLElement | null;
  const availabilitySyncPanel = document.getElementById('availability-sync-panel') as HTMLElement | null;
  const availabilitySyncEventId = document.getElementById('availability-sync-event-id') as HTMLInputElement | null;
  const availabilitySyncStatus = document.getElementById('availability-sync-status') as HTMLSelectElement | null;
  const availabilitySyncSeatsTotal = document.getElementById('availability-sync-seats-total') as HTMLInputElement | null;
  const availabilitySyncSeatsRemaining = document.getElementById('availability-sync-seats-remaining') as HTMLInputElement | null;
  const availabilitySyncProvider = document.getElementById('availability-sync-provider') as HTMLInputElement | null;
  const availabilitySyncToken = document.getElementById('availability-sync-token') as HTMLInputElement | null;
  const availabilitySyncSubmit = document.getElementById('availability-sync-submit') as HTMLButtonElement | null;
  const availabilityWebhookSubmit = document.getElementById('availability-webhook-submit') as HTMLButtonElement | null;
  const availabilitySyncStatusText = document.getElementById('availability-sync-status-text') as HTMLElement | null;
  const availabilitySyncResponse = document.getElementById('availability-sync-response') as HTMLElement | null;
  const fraudOpsDashboard = document.getElementById('fraud-ops-dashboard') as HTMLElement | null;
  const fraudOpsMetrics = document.getElementById('fraud-ops-metrics') as HTMLElement | null;
  const fraudOpsRefresh = document.getElementById('fraud-ops-refresh') as HTMLButtonElement | null;
  const fraudReviewQueuePanel = document.getElementById('fraud-review-queue-panel') as HTMLElement | null;
  const fraudReviewStatusFilter = document.getElementById('fraud-review-status-filter') as HTMLSelectElement | null;
  const fraudReviewLimit = document.getElementById('fraud-review-limit') as HTMLInputElement | null;
  const fraudReviewReviewer = document.getElementById('fraud-review-reviewer') as HTMLInputElement | null;
  const fraudReviewNotes = document.getElementById('fraud-review-notes') as HTMLInputElement | null;
  const fraudReviewRefresh = document.getElementById('fraud-review-refresh') as HTMLButtonElement | null;
  const fraudReviewStatus = document.getElementById('fraud-review-status') as HTMLElement | null;
  const fraudReviewList = document.getElementById('fraud-review-list') as HTMLElement | null;
  const aiReviewSamplingPanel = document.getElementById('ai-review-sampling-panel') as HTMLElement | null;
  const aiReviewStatusFilter = document.getElementById('ai-review-status-filter') as HTMLSelectElement | null;
  const aiReviewReviewer = document.getElementById('ai-review-reviewer') as HTMLInputElement | null;
  const aiReviewNotes = document.getElementById('ai-review-notes') as HTMLInputElement | null;
  const aiReviewRefresh = document.getElementById('ai-review-refresh') as HTMLButtonElement | null;
  const aiReviewStatus = document.getElementById('ai-review-status') as HTMLElement | null;
  const aiReviewList = document.getElementById('ai-review-list') as HTMLElement | null;
  const inquiryProfilePanel = document.getElementById('smart-search-inquiry-profile') as HTMLElement | null;
  const schedulingPanel = document.getElementById('smart-search-scheduling-panel') as HTMLElement | null;
  const aiPanel = document.getElementById('smart-search-ai-panel') as HTMLElement | null;
  const experiencePanel = document.getElementById('smart-search-experience-panel') as HTMLElement | null;
  const accessibilityPanel = document.getElementById('smart-search-accessibility-panel') as HTMLElement | null;
  const insightsHubPanel = document.getElementById('insights-hub-panel') as HTMLElement | null;
  const insightsHubSummary = document.getElementById('insights-hub-summary') as HTMLElement | null;
  const insightsHubRefresh = document.getElementById('insights-hub-refresh') as HTMLButtonElement | null;
  const userDashboardsPanel = document.getElementById('user-dashboards-panel') as HTMLElement | null;
  const userDashboardsOwnerId = document.getElementById('user-dashboards-owner-id') as HTMLInputElement | null;
  const userDashboardsName = document.getElementById('user-dashboards-name') as HTMLInputElement | null;
  const userDashboardsMetric = document.getElementById('user-dashboards-metric') as HTMLSelectElement | null;
  const userDashboardsVisualization = document.getElementById('user-dashboards-visualization') as HTMLSelectElement | null;
  const userDashboardsWindowDays = document.getElementById('user-dashboards-window-days') as HTMLInputElement | null;
  const userDashboardsSave = document.getElementById('user-dashboards-save') as HTMLButtonElement | null;
  const userDashboardsRefresh = document.getElementById('user-dashboards-refresh') as HTMLButtonElement | null;
  const userDashboardsStatus = document.getElementById('user-dashboards-status') as HTMLElement | null;
  const userDashboardsList = document.getElementById('user-dashboards-list') as HTMLElement | null;
  const experimentationPanel = document.getElementById('experimentation-panel') as HTMLElement | null;
  const experimentationSummary = document.getElementById('experimentation-summary') as HTMLElement | null;
  const experimentationId = document.getElementById('experimentation-id') as HTMLSelectElement | null;
  const experimentationRollbackReason = document.getElementById('experimentation-rollback-reason') as HTMLInputElement | null;
  const experimentationRefresh = document.getElementById('experimentation-refresh') as HTMLButtonElement | null;
  const experimentationRollback = document.getElementById('experimentation-rollback') as HTMLButtonElement | null;
  const experimentationStatus = document.getElementById('experimentation-status') as HTMLElement | null;
  const webhookOpsPanel = document.getElementById('webhook-ops-panel') as HTMLElement | null;
  const webhookOpsPartnerId = document.getElementById('webhook-ops-partner-id') as HTMLInputElement | null;
  const webhookOpsSharedSecret = document.getElementById('webhook-ops-shared-secret') as HTMLInputElement | null;
  const webhookOpsEventId = document.getElementById('webhook-ops-event-id') as HTMLInputElement | null;
  const webhookOpsEventType = document.getElementById('webhook-ops-event-type') as HTMLInputElement | null;
  const webhookOpsTimestamp = document.getElementById('webhook-ops-timestamp') as HTMLInputElement | null;
  const webhookOpsNonce = document.getElementById('webhook-ops-nonce') as HTMLInputElement | null;
  const webhookOpsPayload = document.getElementById('webhook-ops-payload') as HTMLTextAreaElement | null;
  const webhookOpsSend = document.getElementById('webhook-ops-send') as HTMLButtonElement | null;
  const webhookOpsReset = document.getElementById('webhook-ops-reset') as HTMLButtonElement | null;
  const webhookOpsStatus = document.getElementById('webhook-ops-status') as HTMLElement | null;
  const webhookOpsResponse = document.getElementById('webhook-ops-response') as HTMLElement | null;
  const partnerOpsPanel = document.getElementById('partner-ops-panel') as HTMLElement | null;
  const partnerOpsWorkspaceId = document.getElementById('partner-ops-workspace-id') as HTMLInputElement | null;
  const partnerOpsMemberId = document.getElementById('partner-ops-member-id') as HTMLInputElement | null;
  const partnerOpsRoleId = document.getElementById('partner-ops-role-id') as HTMLSelectElement | null;
  const partnerOpsAssignedBy = document.getElementById('partner-ops-assigned-by') as HTMLInputElement | null;
  const partnerOpsTenantId = document.getElementById('partner-ops-tenant-id') as HTMLInputElement | null;
  const partnerOpsBrandName = document.getElementById('partner-ops-brand-name') as HTMLInputElement | null;
  const partnerOpsPrimaryColor = document.getElementById('partner-ops-primary-color') as HTMLInputElement | null;
  const partnerOpsAccentColor = document.getElementById('partner-ops-accent-color') as HTMLInputElement | null;
  const partnerOpsLogoUrl = document.getElementById('partner-ops-logo-url') as HTMLInputElement | null;
  const partnerOpsFeatureOverrides = document.getElementById('partner-ops-feature-overrides') as HTMLTextAreaElement | null;
  const partnerOpsPhase = document.getElementById('partner-ops-phase') as HTMLSelectElement | null;
  const partnerOpsPhaseStatus = document.getElementById('partner-ops-phase-status') as HTMLSelectElement | null;
  const partnerOpsAssignRole = document.getElementById('partner-ops-assign-role') as HTMLButtonElement | null;
  const partnerOpsLoadPortal = document.getElementById('partner-ops-load-portal') as HTMLButtonElement | null;
  const partnerOpsSavePortal = document.getElementById('partner-ops-save-portal') as HTMLButtonElement | null;
  const partnerOpsUpdatePhase = document.getElementById('partner-ops-update-phase') as HTMLButtonElement | null;
  const partnerOpsStatus = document.getElementById('partner-ops-status') as HTMLElement | null;
  const partnerOpsSummary = document.getElementById('partner-ops-summary') as HTMLElement | null;
  const partnerOpsAssignments = document.getElementById('partner-ops-assignments') as HTMLElement | null;
  const partnerOpsPortalConfig = document.getElementById('partner-ops-portal-config') as HTMLElement | null;
  const partnerOpsRefresh = document.getElementById('partner-ops-refresh') as HTMLButtonElement | null;

  if (!section || !form || !status || !results || !savedPanel || !savedList) return;

  const enabled = isFeatureEnabled('unified_smart_search');
  section.hidden = !enabled;
  if (!enabled) return;

  const alertsEnabled = isFeatureEnabled('saved_searches_alerts');
  const compareEnabled = isFeatureEnabled('compare_mode');
  const dynamicFilterBuilderEnabled = isFeatureEnabled('dynamic_filter_builder');
  const availabilitySyncEnabled = isFeatureEnabled('realtime_availability_sync');
  const fraudRiskEnabled = isFeatureEnabled('fraud_risk_scoring');
  const oneClickEnabled = isFeatureEnabled('one_click_inquiry_application');
  const schedulingEnabled = isFeatureEnabled('in_app_scheduling_calendar_sync');
  const aiConciergeEnabled = isFeatureEnabled('ai_concierge_chat');
  const aiShortlistEnabled = isFeatureEnabled('ai_shortlist_builder');
  const aiNegotiationEnabled = isFeatureEnabled('ai_negotiation_prep_assistant');
  const aiDocumentHelperEnabled = isFeatureEnabled('ai_document_helper');
  const aiFollowUpEnabled = isFeatureEnabled('ai_follow_up_automation');
  const aiNextBestActionEnabled = isFeatureEnabled('ai_next_best_action');
  const aiReviewSamplingEnabled = aiConciergeEnabled || aiShortlistEnabled || aiNegotiationEnabled || aiDocumentHelperEnabled;
  const aiSuppressionEnabled = aiFollowUpEnabled || aiNextBestActionEnabled;
  const multiLanguageEnabled = isFeatureEnabled('multi_language_ux');
  const accessibilityFirstEnabled = isFeatureEnabled('accessibility_first_mode');
  const userDashboardsEnabled = isFeatureEnabled('user_defined_dashboards');
  const experimentationEnabled = isFeatureEnabled('experimentation_framework');
  const webhookAccessEnabled = isFeatureEnabled('api_webhook_access');
  const insightsHubEnabled = isFeatureEnabled('insights_hub');
  const partnerRolesEnabled = isFeatureEnabled('partner_workspace_roles');
  const whiteLabelEnabled = isFeatureEnabled('white_label_partner_portals');
  savedPanel.hidden = !alertsEnabled;
  if (filterBuilder) filterBuilder.hidden = !dynamicFilterBuilderEnabled;
  if (comparePanel) comparePanel.hidden = !compareEnabled;
  if (availabilitySyncPanel) availabilitySyncPanel.hidden = !availabilitySyncEnabled;
  if (fraudOpsDashboard) fraudOpsDashboard.hidden = !fraudRiskEnabled;
  if (fraudReviewQueuePanel) fraudReviewQueuePanel.hidden = !fraudRiskEnabled;
  if (inquiryProfilePanel) inquiryProfilePanel.hidden = !oneClickEnabled;
  if (schedulingPanel) schedulingPanel.hidden = !schedulingEnabled;
  if (aiPanel) aiPanel.hidden = !(aiConciergeEnabled || aiShortlistEnabled || aiNegotiationEnabled || aiDocumentHelperEnabled || aiFollowUpEnabled || aiNextBestActionEnabled);
  if (aiReviewSamplingPanel) aiReviewSamplingPanel.hidden = !aiReviewSamplingEnabled;
  if (experiencePanel) experiencePanel.hidden = !(multiLanguageEnabled || accessibilityFirstEnabled);
  if (accessibilityPanel) accessibilityPanel.hidden = !accessibilityFirstEnabled;
  if (userDashboardsPanel) userDashboardsPanel.hidden = !userDashboardsEnabled;
  if (experimentationPanel) experimentationPanel.hidden = !experimentationEnabled;
  if (webhookOpsPanel) webhookOpsPanel.hidden = !webhookAccessEnabled;
  if (insightsHubPanel) insightsHubPanel.hidden = !insightsHubEnabled;
  if (partnerOpsPanel) partnerOpsPanel.hidden = !(partnerRolesEnabled && whiteLabelEnabled);

  const selectedCompareIds = new Set<string>();
  let latestResults: SmartSearchResult[] = [];
  let lastQueryText = '';
  let lastActiveFilters: SmartSearchFilters = {};
  let lastExperimentAssignments: string[] = [];
  let lastSearchCompletedAtMs: number | null = null;
  let filterPresets = readSmartSearchFilterPresets();
  let recentQueries = readRecentSmartSearchQueries();
  let lastSearchRequest = readLastSmartSearchRequest();
  const inquiryIdsByEventId = new Map<string, string>();
  const inquirySubmittedAtById = new Map<string, number>();

  const queryInput = form.querySelector<HTMLInputElement>('#smart-search-query');
  const boroughSelect = form.querySelector<HTMLSelectElement>('#smart-search-borough');
  const categorySelect = form.querySelector<HTMLSelectElement>('#smart-search-category');
  const maxPriceInput = form.querySelector<HTMLInputElement>('#smart-search-max-price');
  const startsBeforeInput = form.querySelector<HTMLInputElement>('#smart-search-starts-before-hour');
  const withinWalkInput = form.querySelector<HTMLInputElement>('#smart-search-within-walk-minutes');
  const homeBoroughSelect = form.querySelector<HTMLSelectElement>('#smart-search-home-borough');
  const workBoroughSelect = form.querySelector<HTMLSelectElement>('#smart-search-work-borough');
  const commuteAnchorSelect = form.querySelector<HTMLSelectElement>('#smart-search-commute-anchor');
  const neighborhoodVibeSelect = form.querySelector<HTMLSelectElement>('#smart-search-neighborhood-vibe');
  const neighborhoodCrowdSelect = form.querySelector<HTMLSelectElement>('#smart-search-neighborhood-crowd');
  const neighborhoodBudgetSelect = form.querySelector<HTMLSelectElement>('#smart-search-neighborhood-budget');
  const profileNameInput = document.getElementById('smart-search-profile-name') as HTMLInputElement | null;
  const profileEmailInput = document.getElementById('smart-search-profile-email') as HTMLInputElement | null;
  const profilePhoneInput = document.getElementById('smart-search-profile-phone') as HTMLInputElement | null;
  const profileChannelSelect = document.getElementById('smart-search-profile-channel') as HTMLSelectElement | null;
  const profileNoteInput = document.getElementById('smart-search-profile-note') as HTMLInputElement | null;
  const scheduleProviderSelect = document.getElementById('smart-search-calendar-provider') as HTMLSelectElement | null;
  const scheduleDateInput = document.getElementById('smart-search-schedule-date') as HTMLInputElement | null;
  const scheduleTimeInput = document.getElementById('smart-search-schedule-time') as HTMLInputElement | null;
  const autoScheduleToggle = document.getElementById('smart-search-auto-schedule') as HTMLInputElement | null;
  const languageSelect = document.getElementById('smart-search-language-select') as HTMLSelectElement | null;
  const accessibilityHighContrast = document.getElementById('smart-search-a11y-high-contrast') as HTMLInputElement | null;
  const accessibilityReducedMotion = document.getElementById('smart-search-a11y-reduced-motion') as HTMLInputElement | null;
  const accessibilityKeyboardFirst = document.getElementById('smart-search-a11y-keyboard-first') as HTMLInputElement | null;
  const aiConciergeQueryInput = document.getElementById('smart-search-ai-concierge-query') as HTMLInputElement | null;
  const aiConciergeSubmit = document.getElementById('smart-search-ai-concierge-submit') as HTMLButtonElement | null;
  const aiConciergeStatus = document.getElementById('smart-search-ai-concierge-status') as HTMLElement | null;
  const aiConciergeAnswer = document.getElementById('smart-search-ai-concierge-answer') as HTMLElement | null;
  const aiConciergeCitations = document.getElementById('smart-search-ai-concierge-citations') as HTMLElement | null;
  const aiShortlistIntentInput = document.getElementById('smart-search-ai-shortlist-intent') as HTMLInputElement | null;
  const aiShortlistSubmit = document.getElementById('smart-search-ai-shortlist-submit') as HTMLButtonElement | null;
  const aiShortlistStatus = document.getElementById('smart-search-ai-shortlist-status') as HTMLElement | null;
  const aiShortlistResults = document.getElementById('smart-search-ai-shortlist-results') as HTMLElement | null;
  const aiNegotiationGoalsInput = document.getElementById('smart-search-ai-negotiation-goals') as HTMLInputElement | null;
  const aiNegotiationSubmit = document.getElementById('smart-search-ai-negotiation-submit') as HTMLButtonElement | null;
  const aiNegotiationStatus = document.getElementById('smart-search-ai-negotiation-status') as HTMLElement | null;
  const aiNegotiationPoints = document.getElementById('smart-search-ai-negotiation-points') as HTMLElement | null;
  const aiNegotiationScript = document.getElementById('smart-search-ai-negotiation-script') as HTMLElement | null;
  const aiDocumentText = document.getElementById('smart-search-ai-document-text') as HTMLTextAreaElement | null;
  const aiDocumentSubmit = document.getElementById('smart-search-ai-document-submit') as HTMLButtonElement | null;
  const aiDocumentStatus = document.getElementById('smart-search-ai-document-status') as HTMLElement | null;
  const aiDocumentSummary = document.getElementById('smart-search-ai-document-summary') as HTMLElement | null;
  const aiDocumentChecklist = document.getElementById('smart-search-ai-document-checklist') as HTMLElement | null;
  const aiFollowUpRecipientInput = document.getElementById('smart-search-ai-followup-recipient') as HTMLInputElement | null;
  const aiFollowUpTemplateSelect = document.getElementById('smart-search-ai-followup-template') as HTMLSelectElement | null;
  const aiFollowUpApprove = document.getElementById('smart-search-ai-followup-approve') as HTMLButtonElement | null;
  const aiFollowUpSubmit = document.getElementById('smart-search-ai-followup-submit') as HTMLButtonElement | null;
  const aiFollowUpStatus = document.getElementById('smart-search-ai-followup-status') as HTMLElement | null;
  const aiFollowUpMessage = document.getElementById('smart-search-ai-followup-message') as HTMLElement | null;
  const aiSuppressionRecipientInput = document.getElementById('smart-search-ai-suppression-recipient') as HTMLInputElement | null;
  const aiSuppressionQuietStartInput = document.getElementById('smart-search-ai-suppression-quiet-start') as HTMLInputElement | null;
  const aiSuppressionQuietEndInput = document.getElementById('smart-search-ai-suppression-quiet-end') as HTMLInputElement | null;
  const aiSuppressionFrequencyCapInput = document.getElementById('smart-search-ai-suppression-cap') as HTMLInputElement | null;
  const aiSuppressionOptOutInput = document.getElementById('smart-search-ai-suppression-opt-out') as HTMLInputElement | null;
  const aiSuppressionLoad = document.getElementById('smart-search-ai-suppression-load') as HTMLButtonElement | null;
  const aiSuppressionSave = document.getElementById('smart-search-ai-suppression-save') as HTMLButtonElement | null;
  const aiDispatchesRefresh = document.getElementById('smart-search-ai-dispatches-refresh') as HTMLButtonElement | null;
  const aiSuppressionStatus = document.getElementById('smart-search-ai-suppression-status') as HTMLElement | null;
  const aiDispatchesList = document.getElementById('smart-search-ai-dispatches') as HTMLElement | null;
  const aiNextBestActionStageSelect = document.getElementById('smart-search-ai-nba-stage') as HTMLSelectElement | null;
  const aiNextBestActionSubmit = document.getElementById('smart-search-ai-nba-submit') as HTMLButtonElement | null;
  const aiNextBestActionStatus = document.getElementById('smart-search-ai-nba-status') as HTMLElement | null;
  const aiNextBestActionList = document.getElementById('smart-search-ai-nba-actions') as HTMLElement | null;
  const submit = form.querySelector<HTMLButtonElement>('#smart-search-submit');
  const quickTemplateButtons = Array.from(section.querySelectorAll<HTMLButtonElement>('[data-smart-query-template]'));
  const runLastSearchButton = document.getElementById('smart-search-run-last') as HTMLButtonElement | null;
  const recentQueriesList = document.getElementById('smart-search-recent-queries') as HTMLElement | null;
  const showAdvancedToggle = document.getElementById('smart-search-show-advanced') as HTMLInputElement | null;
  const advancedDetails = document.getElementById('smart-search-advanced-details') as HTMLDetailsElement | null;
  const isOpsWorkspace = window.location.pathname === '/ops';

  if (showAdvancedToggle && advancedDetails) {
    const toggleRow = showAdvancedToggle.closest('.smart-search-advanced-toggle-row') as HTMLElement | null;
    if (!isOpsWorkspace) {
      if (toggleRow) toggleRow.hidden = true;
      showAdvancedToggle.checked = false;
      advancedDetails.hidden = true;
      advancedDetails.open = false;
    } else {
      showAdvancedToggle.checked = true;
    }
    const syncAdvancedVisibility = (): void => {
      const enabled = showAdvancedToggle.checked;
      advancedDetails.hidden = !enabled;
      advancedDetails.open = enabled;
    };
    syncAdvancedVisibility();
    showAdvancedToggle.addEventListener('change', syncAdvancedVisibility);
  }

  const readFiltersFromForm = (): SmartSearchFilters => {
    const maxPrice = parseFilterNumber(maxPriceInput?.value, 0, 10000);
    const startsBeforeHour = parseFilterNumber(startsBeforeInput?.value, 0, 23);
    const withinWalkMinutes = parseFilterNumber(withinWalkInput?.value, 1, 120);
    return {
      ...(boroughSelect?.value ? { borough: boroughSelect.value as SmartSearchFilters['borough'] } : {}),
      ...(categorySelect?.value ? { category: categorySelect.value as SmartSearchFilters['category'] } : {}),
      ...(typeof maxPrice === 'number' ? { max_price: maxPrice } : {}),
      ...(typeof startsBeforeHour === 'number' ? { starts_before_hour: startsBeforeHour } : {}),
      ...(typeof withinWalkMinutes === 'number' ? { within_walk_minutes: withinWalkMinutes } : {}),
    };
  };

  const readInquiryProfileFromForm = (): InquiryProfileDraft => compactInquiryProfileDraft({
    full_name: profileNameInput?.value,
    email: profileEmailInput?.value,
    phone: profilePhoneInput?.value,
    preferred_contact_channel:
      (profileChannelSelect?.value === 'email' || profileChannelSelect?.value === 'sms' || profileChannelSelect?.value === 'phone')
        ? profileChannelSelect.value
        : undefined,
    note: profileNoteInput?.value,
  });

  const applyInquiryProfileToForm = (profile: InquiryProfileDraft): void => {
    if (profileNameInput) profileNameInput.value = profile.full_name ?? '';
    if (profileEmailInput) profileEmailInput.value = profile.email ?? '';
    if (profilePhoneInput) profilePhoneInput.value = profile.phone ?? '';
    if (profileChannelSelect) profileChannelSelect.value = profile.preferred_contact_channel ?? 'email';
    if (profileNoteInput) profileNoteInput.value = profile.note ?? '';
  };

  const storedProfile = readStoredInquiryProfile();
  const onboardingProfile = readOnboardingProfile();
  const onboardingPreferences = readOnboardingPreferences();
  const onboardingInquiryDefaults: InquiryProfileDraft = compactInquiryProfileDraft({
    ...(onboardingPreferences.autofill_lead_enabled && onboardingProfile?.city
      ? {
        note: `Planning context: ${onboardingProfile.city}${onboardingProfile.borough
          ? ` • ${titleCase(onboardingProfile.borough)}`
          : ''}${onboardingProfile.team_size ? ` • team ${titleCase(onboardingProfile.team_size)}` : ''}`,
      }
      : {}),
  });
  if (oneClickEnabled) {
    const initialProfile = compactInquiryProfileDraft({
      ...onboardingInquiryDefaults,
      ...storedProfile,
    });
    applyInquiryProfileToForm(initialProfile);
    writeStoredInquiryProfile(initialProfile);
    for (const input of [profileNameInput, profileEmailInput, profilePhoneInput, profileNoteInput]) {
      input?.addEventListener('input', () => {
        writeStoredInquiryProfile(readInquiryProfileFromForm());
      });
    }
    profileChannelSelect?.addEventListener('change', () => {
      writeStoredInquiryProfile(readInquiryProfileFromForm());
    });
    void loadInquiryProfile(pageState.sessionId || undefined).then((profile) => {
      if (!profile) return;
      const merged = compactInquiryProfileDraft({
        ...onboardingInquiryDefaults,
        ...storedProfile,
        ...profile,
      });
      applyInquiryProfileToForm(merged);
      writeStoredInquiryProfile(merged);
    });
  }

  if (scheduleDateInput && !scheduleDateInput.value) {
    const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const yyyy = defaultDate.getFullYear();
    const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
    const dd = String(defaultDate.getDate()).padStart(2, '0');
    scheduleDateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  const applyAccessibilityClasses = (prefs: {
    high_contrast: boolean;
    reduced_motion: boolean;
    keyboard_first: boolean;
  }): void => {
    document.body.classList.toggle('accessibility-first', prefs.high_contrast || prefs.keyboard_first);
    document.body.classList.toggle('reduced-motion', prefs.reduced_motion);
  };

  if (accessibilityFirstEnabled && pageState.sessionId) {
    void requestAccessibilityPreference(pageState.sessionId).then((response) => {
      if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) return;
      if (accessibilityHighContrast) accessibilityHighContrast.checked = response.body.preference.high_contrast;
      if (accessibilityReducedMotion) accessibilityReducedMotion.checked = response.body.preference.reduced_motion;
      if (accessibilityKeyboardFirst) accessibilityKeyboardFirst.checked = response.body.preference.keyboard_first;
      applyAccessibilityClasses(response.body.preference);
    });

    const persistAccessibilityPreference = (): void => {
      const payload = {
        session_id: pageState.sessionId,
        high_contrast: accessibilityHighContrast?.checked ?? true,
        reduced_motion: accessibilityReducedMotion?.checked ?? true,
        keyboard_first: accessibilityKeyboardFirst?.checked ?? true,
      };
      applyAccessibilityClasses(payload);
      void trackEvent({
        event_name: 'accessibility_mode_updated',
        properties: {
          high_contrast: payload.high_contrast,
          reduced_motion: payload.reduced_motion,
          keyboard_first: payload.keyboard_first,
        },
      });
      void saveAccessibilityPreference(payload);
    };

    accessibilityHighContrast?.addEventListener('change', persistAccessibilityPreference);
    accessibilityReducedMotion?.addEventListener('change', persistAccessibilityPreference);
    accessibilityKeyboardFirst?.addEventListener('change', () => {
      persistAccessibilityPreference();
      if (accessibilityKeyboardFirst?.checked) {
        queryInput?.focus();
      }
    });
  }

  const applyI18nBundle = (bundle: ExperienceI18nResponse): void => {
    const title = section.querySelector('.section-headline');
    if (title) title.textContent = bundle.labels.smart_search_title;
    const subtitle = document.getElementById('smart-search-subheadline');
    if (subtitle) subtitle.textContent = bundle.labels.smart_search_subtitle;

    const queryLabel = document.getElementById('smart-search-query-label');
    if (queryLabel) queryLabel.textContent = 'What are you looking for?';
    const boroughLabel = document.getElementById('smart-search-borough-label');
    if (boroughLabel) boroughLabel.textContent = bundle.labels.borough;
    const categoryLabel = document.getElementById('smart-search-category-label');
    if (categoryLabel) categoryLabel.textContent = bundle.labels.category;
    const maxPriceLabel = document.getElementById('smart-search-max-price-label');
    if (maxPriceLabel) maxPriceLabel.textContent = bundle.labels.max_price;
    const startsBeforeLabel = document.getElementById('smart-search-starts-before-label');
    if (startsBeforeLabel) startsBeforeLabel.textContent = bundle.labels.starts_before;
    const walkDistanceLabel = document.getElementById('smart-search-walk-distance-label');
    if (walkDistanceLabel) walkDistanceLabel.textContent = bundle.labels.walk_distance;
    if (submit) submit.textContent = bundle.labels.search_button;

    const categoryOptions = categorySelect ? Array.from(categorySelect.options) : [];
    for (const option of categoryOptions) {
      if (!option.value) continue;
      const value = option.value as keyof ExperienceI18nResponse['taxonomy']['categories'];
      const translated = bundle.taxonomy.categories[value];
      if (translated) option.textContent = translated;
    }

    const boroughOptions = boroughSelect ? Array.from(boroughSelect.options) : [];
    for (const option of boroughOptions) {
      if (!option.value) continue;
      const value = option.value as keyof ExperienceI18nResponse['taxonomy']['boroughs'];
      const translated = bundle.taxonomy.boroughs[value];
      if (translated) option.textContent = translated;
    }
  };

  if (multiLanguageEnabled && languageSelect) {
    languageSelect.addEventListener('change', () => {
      void requestExperienceI18n(languageSelect.value).then((response) => {
        if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) return;
        applyI18nBundle(response.body);
        void trackEvent({
          event_name: 'ux_locale_applied',
          properties: {
            requested_locale: languageSelect.value,
            resolved_locale: response.body.resolved_locale,
          },
        });
      });
    });

    void requestExperienceI18n(languageSelect.value).then((response) => {
      if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) return;
      applyI18nBundle(response.body);
      void trackEvent({
        event_name: 'ux_locale_applied',
        properties: {
          requested_locale: languageSelect.value,
          resolved_locale: response.body.resolved_locale,
        },
      });
    });
  }

  const hasActiveFilters = (filters: SmartSearchFilters): boolean => (
    Boolean(filters.borough)
    || Boolean(filters.category)
    || typeof filters.max_price === 'number'
    || typeof filters.starts_before_hour === 'number'
    || typeof filters.within_walk_minutes === 'number'
  );

  const applyFiltersToForm = (filters: SmartSearchFilters): void => {
    if (boroughSelect) boroughSelect.value = filters.borough ?? '';
    if (categorySelect) categorySelect.value = filters.category ?? '';
    if (maxPriceInput) maxPriceInput.value = typeof filters.max_price === 'number' ? String(filters.max_price) : '';
    if (startsBeforeInput) startsBeforeInput.value = typeof filters.starts_before_hour === 'number'
      ? String(filters.starts_before_hour)
      : '';
    if (withinWalkInput) withinWalkInput.value = typeof filters.within_walk_minutes === 'number'
      ? String(filters.within_walk_minutes)
      : '';
  };

  const updateRunLastButtonState = (): void => {
    if (!runLastSearchButton) return;
    runLastSearchButton.disabled = !lastSearchRequest;
  };

  const syncSearchStateToUrl = (query: string, filters: SmartSearchFilters): void => {
    if (!window.history || typeof window.history.replaceState !== 'function') return;
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    if (filters.borough) url.searchParams.set('borough', filters.borough);
    else url.searchParams.delete('borough');
    if (filters.category) url.searchParams.set('category', filters.category);
    else url.searchParams.delete('category');
    if (typeof filters.max_price === 'number') url.searchParams.set('max_price', String(filters.max_price));
    else url.searchParams.delete('max_price');
    if (typeof filters.starts_before_hour === 'number') url.searchParams.set('starts_before_hour', String(filters.starts_before_hour));
    else url.searchParams.delete('starts_before_hour');
    if (typeof filters.within_walk_minutes === 'number') url.searchParams.set('within_walk_minutes', String(filters.within_walk_minutes));
    else url.searchParams.delete('within_walk_minutes');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const applyStoredSearchRequest = (request: SmartSearchLastRequest | null): boolean => {
    if (!request || !queryInput) return false;
    const query = request.query.trim();
    if (!query) return false;
    queryInput.value = query;
    applyFiltersToForm(request.filters);
    if (homeBoroughSelect) homeBoroughSelect.value = request.commute_profile?.home_borough ?? '';
    if (workBoroughSelect) workBoroughSelect.value = request.commute_profile?.work_borough ?? '';
    if (commuteAnchorSelect) commuteAnchorSelect.value = request.commute_profile?.profile_anchor ?? 'balanced';
    if (neighborhoodVibeSelect) neighborhoodVibeSelect.value = request.neighborhood_profile?.preferred_vibe ?? '';
    if (neighborhoodCrowdSelect) neighborhoodCrowdSelect.value = request.neighborhood_profile?.crowd_tolerance ?? '';
    if (neighborhoodBudgetSelect) neighborhoodBudgetSelect.value = request.neighborhood_profile?.budget_preference ?? '';
    return true;
  };

  const renderRecentQueryButtons = (): void => {
    if (!recentQueriesList) return;
    renderRecentSmartSearchQueries(recentQueriesList, recentQueries, (query) => {
      if (!queryInput) return;
      queryInput.value = query;
      form.requestSubmit();
    });
  };

  const restoreSearchStateFromUrl = (): boolean => {
    if (!queryInput) return false;
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q')?.trim() ?? '';
    if (!query) return false;
    queryInput.value = query;

    const borough = params.get('borough') ?? '';
    if (boroughSelect && borough && Array.from(boroughSelect.options).some((option) => option.value === borough)) {
      boroughSelect.value = borough;
    }
    const category = params.get('category') ?? '';
    if (categorySelect && category && Array.from(categorySelect.options).some((option) => option.value === category)) {
      categorySelect.value = category;
    }
    const maxPrice = parseFilterNumber(params.get('max_price') ?? undefined, 0, 10000);
    if (maxPriceInput) maxPriceInput.value = typeof maxPrice === 'number' ? String(maxPrice) : '';
    const startsBefore = parseFilterNumber(params.get('starts_before_hour') ?? undefined, 0, 23);
    if (startsBeforeInput) startsBeforeInput.value = typeof startsBefore === 'number' ? String(startsBefore) : '';
    const walkMinutes = parseFilterNumber(params.get('within_walk_minutes') ?? undefined, 1, 120);
    if (withinWalkInput) withinWalkInput.value = typeof walkMinutes === 'number' ? String(walkMinutes) : '';
    return true;
  };

  const clearFilterByKey = (key: keyof SmartSearchFilters): void => {
    if (key === 'borough' && boroughSelect) boroughSelect.value = '';
    if (key === 'category' && categorySelect) categorySelect.value = '';
    if (key === 'max_price' && maxPriceInput) maxPriceInput.value = '';
    if (key === 'starts_before_hour' && startsBeforeInput) startsBeforeInput.value = '';
    if (key === 'within_walk_minutes' && withinWalkInput) withinWalkInput.value = '';
    if (dynamicFilterBuilderEnabled && filterChipList) {
      renderActiveFilterChips(filterChipList, readFiltersFromForm(), clearFilterByKey);
    }
  };

  const refreshFilterBuilderUI = (): void => {
    if (!dynamicFilterBuilderEnabled || !filterChipList || !presetList) return;
    renderActiveFilterChips(filterChipList, readFiltersFromForm(), clearFilterByKey);
    renderFilterPresetList(presetList, filterPresets, {
      onApply: (preset) => {
        applyFiltersToForm(preset.filters);
        renderActiveFilterChips(filterChipList, readFiltersFromForm(), clearFilterByKey);
        status.textContent = `Applied preset "${preset.name}".`;
      },
      onDelete: (presetId) => {
        filterPresets = filterPresets.filter((preset) => preset.id !== presetId);
        writeSmartSearchFilterPresets(filterPresets);
        refreshFilterBuilderUI();
      },
    });
  };

  const restoredFromUrl = restoreSearchStateFromUrl();
  if (!restoredFromUrl && queryInput && !queryInput.value) {
    applyStoredSearchRequest(lastSearchRequest);
  }
  updateRunLastButtonState();
  renderRecentQueryButtons();
  if (dynamicFilterBuilderEnabled && filterChipList) {
    renderActiveFilterChips(filterChipList, readFiltersFromForm(), clearFilterByKey);
  }

  const refreshComparePanel = (): void => {
    if (!compareEnabled || !comparePanel || !compareSummary || !compareGrid) return;
    const byId = new Map(latestResults.map((item) => [item.id, item]));
    for (const eventId of Array.from(selectedCompareIds)) {
      if (!byId.has(eventId)) selectedCompareIds.delete(eventId);
    }
    const compared = Array.from(selectedCompareIds)
      .map((eventId) => byId.get(eventId))
      .filter((item): item is SmartSearchResult => Boolean(item));
    renderComparePanel(comparePanel, compareSummary, compareGrid, compared);
  };

  const resolveCalendarProvider = (): CalendarProvider => {
    const provider = scheduleProviderSelect?.value;
    if (provider === 'outlook_calendar' || provider === 'apple_calendar' || provider === 'google_calendar') {
      return provider;
    }
    return 'google_calendar';
  };

  const handleCreateInquiry = async (eventItem: SmartSearchResult): Promise<void> => {
    if (!oneClickEnabled) {
      status.textContent = 'One-click inquiry is not enabled.';
      return;
    }

    const storedBefore = readStoredInquiryProfile();
    const profile = readInquiryProfileFromForm();
    const autofillAvailable = Boolean(storedBefore.full_name || storedBefore.email);
    await trackEvent({
      event_name: 'inquiry_started',
      properties: {
        event_id: eventItem.id,
        inquiry_surface: 'search_result_card',
        autofill_available: autofillAvailable,
      },
    });

    status.textContent = `Submitting inquiry for "${eventItem.title}"...`;
    const response = await createOneClickInquiry({
      event_id: eventItem.id,
      session_id: pageState.sessionId || undefined,
      profile,
    });

    if (response.status === 201 && response.body && 'success' in response.body && response.body.success) {
      inquiryIdsByEventId.set(eventItem.id, response.body.inquiry.id);
      applyInquiryProfileToForm(response.body.autofill_profile);
      writeStoredInquiryProfile(response.body.autofill_profile);

      const hadStoredProfile = Boolean(storedBefore.full_name || storedBefore.email);
      const hasManualInput = Boolean(profile.full_name || profile.email || profile.phone || profile.note);
      const profile_source: 'saved_profile' | 'manual_input' | 'mixed' = hadStoredProfile && hasManualInput
        ? 'mixed'
        : hadStoredProfile
          ? 'saved_profile'
          : 'manual_input';

      await trackEvent({
        event_name: 'inquiry_submitted',
        properties: {
          event_id: eventItem.id,
          inquiry_id: response.body.inquiry.id,
          profile_source,
          preferred_contact_channel: response.body.autofill_profile.preferred_contact_channel,
          auto_schedule_enabled: Boolean(schedulingEnabled && autoScheduleToggle?.checked),
          ...(typeof lastSearchCompletedAtMs === 'number'
            ? { seconds_from_search: Math.max(0, Math.round((Date.now() - lastSearchCompletedAtMs) / 1000)) }
            : {}),
        },
      });

      inquirySubmittedAtById.set(response.body.inquiry.id, Date.now());
      status.textContent = `Inquiry sent for "${eventItem.title}". You can now schedule this event in-app.`;
      if (schedulingEnabled && autoScheduleToggle?.checked) {
        status.textContent = `Inquiry sent for "${eventItem.title}". Scheduling now using your defaults...`;
        await handleScheduleInquiry(eventItem, { autoTriggered: true });
      }
      return;
    }

    if (response.status === 422) {
      status.textContent = 'Inquiry profile is incomplete. Add full name and email, then retry.';
      return;
    }

    if (response.status === 404) {
      status.textContent = 'This event is no longer available for inquiry.';
      return;
    }

    status.textContent = 'Unable to submit inquiry right now. Please try again.';
  };

  const handleScheduleInquiry = async (
    eventItem: SmartSearchResult,
    options?: { autoTriggered?: boolean },
  ): Promise<void> => {
    if (!schedulingEnabled) {
      status.textContent = 'In-app scheduling is not enabled.';
      return;
    }
    const inquiryId = inquiryIdsByEventId.get(eventItem.id);
    if (!inquiryId) {
      status.textContent = 'Send a one-click inquiry first, then schedule this event.';
      return;
    }

    const provider = resolveCalendarProvider();
    const { start_at, end_at } = resolveScheduleWindow(scheduleDateInput?.value, scheduleTimeInput?.value);
    const inquirySubmittedAt = inquirySubmittedAtById.get(inquiryId);
    const secondsFromInquiry = typeof inquirySubmittedAt === 'number'
      ? Math.max(0, Math.round((Date.now() - inquirySubmittedAt) / 1000))
      : undefined;
    await trackEvent({
      event_name: 'schedule_requested',
      properties: {
        inquiry_id: inquiryId,
        event_id: eventItem.id,
        provider,
        start_at,
        auto_triggered: Boolean(options?.autoTriggered),
        ...(typeof secondsFromInquiry === 'number' ? { seconds_from_inquiry: secondsFromInquiry } : {}),
      },
    });

    status.textContent = `Scheduling "${eventItem.title}" on your calendar...`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    const response = await syncCalendarSchedule({
      inquiry_id: inquiryId,
      event_id: eventItem.id,
      session_id: pageState.sessionId || undefined,
      provider,
      start_at,
      end_at,
      timezone,
    });

    if (response.status === 201 && response.body && 'success' in response.body && response.body.success) {
      await trackEvent({
        event_name: 'schedule_confirmed',
        properties: {
          inquiry_id: inquiryId,
          event_id: eventItem.id,
          provider,
          scheduled_id: response.body.schedule.id,
          delivery: response.body.schedule.delivery,
          auto_triggered: Boolean(options?.autoTriggered),
          ...(typeof secondsFromInquiry === 'number' ? { seconds_from_inquiry: secondsFromInquiry } : {}),
        },
      });
      status.textContent = response.body.schedule.calendar_url
        ? `Scheduled "${eventItem.title}". Calendar link: ${response.body.schedule.calendar_url}`
        : `Scheduled "${eventItem.title}" successfully.`;
      return;
    }

    if (response.status === 409 && response.body && 'error' in response.body && response.body.error === 'schedule_conflict') {
      const conflict_count = Array.isArray(response.body.conflicts) ? response.body.conflicts.length : 1;
      await trackEvent({
        event_name: 'schedule_conflict',
        properties: {
          inquiry_id: inquiryId,
          event_id: eventItem.id,
          provider,
          conflict_count,
        },
      });
      status.textContent = `Scheduling conflict detected for "${eventItem.title}". Try a different date or time.`;
      return;
    }

    status.textContent = 'Unable to schedule this inquiry right now. Please try again.';
  };

  const handleAiConcierge = async (): Promise<void> => {
    if (!aiConciergeEnabled || !aiConciergeStatus || !aiConciergeAnswer || !aiConciergeCitations) return;
    const query = aiConciergeQueryInput?.value.trim() || queryInput?.value.trim() || '';
    if (!query) {
      aiConciergeStatus.textContent = 'Enter a concierge prompt first.';
      return;
    }

    aiConciergeStatus.textContent = 'Generating concierge response...';
    if (aiConciergeSubmit) aiConciergeSubmit.disabled = true;
    await trackEvent({
      event_name: 'ai_concierge_prompt',
      properties: {
        query_text: query,
        retrieval_limit: 4,
      },
    });

    const response = await requestAiConcierge({
      query,
      session_id: pageState.sessionId || undefined,
      retrieval_limit: 4,
      filters: readFiltersFromForm(),
    });

    if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
      aiConciergeAnswer.textContent = response.body.answer;
      renderAiConciergeCitations(aiConciergeCitations, response.body.citations);
      aiConciergeStatus.textContent = `Response ready (${response.body.telemetry.model_version}).`;

      await trackEvent({
        event_name: 'ai_concierge_response',
        properties: {
          query_text: query,
          citation_count: response.body.citations.length,
          prompt_version: response.body.telemetry.prompt_version,
          model_version: response.body.telemetry.model_version,
          fallback_used: response.body.telemetry.fallback_used,
        },
      });
      if (response.body.telemetry.fallback_used) {
        await trackEvent({
          event_name: 'ai_fallback_triggered',
          properties: {
            feature: 'ai_concierge_chat',
            reason: response.body.telemetry.fallback_reason ?? 'unknown',
            prompt_version: response.body.telemetry.prompt_version,
            model_version: response.body.telemetry.model_version,
          },
        });
      }
      if (response.body.quality?.sampled_for_review && response.body.quality.review_sample_id) {
        await trackEvent({
          event_name: 'ai_quality_sampled',
          properties: {
            feature: 'ai_concierge_chat',
            sample_id: response.body.quality.review_sample_id,
            quality_score: response.body.quality.rubric.overall_score,
            quality_band: response.body.quality.rubric.band,
          },
        });
      }
    } else if (response.status === 422 && response.body && 'error' in response.body) {
      aiConciergeStatus.textContent = response.body.error === 'unsafe_prompt'
        ? 'Prompt blocked by safety filters. Rephrase and try again.'
        : 'Concierge prompt failed validation.';
    } else if (response.status === 503) {
      aiConciergeStatus.textContent = 'AI concierge is not enabled in this environment.';
    } else {
      aiConciergeStatus.textContent = 'Unable to generate concierge response right now.';
    }

    if (aiConciergeSubmit) aiConciergeSubmit.disabled = false;
  };

  const handleAiShortlist = async (): Promise<void> => {
    if (!aiShortlistEnabled || !aiShortlistStatus || !aiShortlistResults) return;
    const intent = aiShortlistIntentInput?.value.trim() || queryInput?.value.trim() || '';
    if (!intent) {
      aiShortlistStatus.textContent = 'Enter shortlist intent first.';
      return;
    }

    aiShortlistStatus.textContent = 'Building shortlist...';
    if (aiShortlistSubmit) aiShortlistSubmit.disabled = true;
    const response = await requestAiShortlist({
      intent,
      session_id: pageState.sessionId || undefined,
      max_items: 3,
      filters: readFiltersFromForm(),
    });

    if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
      renderAiShortlist(aiShortlistResults, response.body.shortlist);
      aiShortlistStatus.textContent = `${response.body.summary} (${response.body.telemetry.model_version})`;

      await trackEvent({
        event_name: 'ai_shortlist_generated',
        properties: {
          intent,
          shortlist_count: response.body.shortlist.length,
          prompt_version: response.body.telemetry.prompt_version,
          model_version: response.body.telemetry.model_version,
          fallback_used: response.body.telemetry.fallback_used,
        },
      });
      if (response.body.telemetry.fallback_used) {
        await trackEvent({
          event_name: 'ai_fallback_triggered',
          properties: {
            feature: 'ai_shortlist_builder',
            reason: response.body.telemetry.fallback_reason ?? 'unknown',
            prompt_version: response.body.telemetry.prompt_version,
            model_version: response.body.telemetry.model_version,
          },
        });
      }
      if (response.body.quality?.sampled_for_review && response.body.quality.review_sample_id) {
        await trackEvent({
          event_name: 'ai_quality_sampled',
          properties: {
            feature: 'ai_shortlist_builder',
            sample_id: response.body.quality.review_sample_id,
            quality_score: response.body.quality.rubric.overall_score,
            quality_band: response.body.quality.rubric.band,
          },
        });
      }
    } else if (response.status === 422 && response.body && 'error' in response.body) {
      aiShortlistStatus.textContent = response.body.error === 'unsafe_prompt'
        ? 'Intent blocked by safety filters. Rephrase and try again.'
        : 'Shortlist intent failed validation.';
    } else if (response.status === 503) {
      aiShortlistStatus.textContent = 'AI shortlist builder is not enabled in this environment.';
    } else {
      aiShortlistStatus.textContent = 'Unable to build shortlist right now.';
    }

    if (aiShortlistSubmit) aiShortlistSubmit.disabled = false;
  };

  const handleAiNegotiationPrep = async (): Promise<void> => {
    if (!aiNegotiationEnabled || !aiNegotiationStatus || !aiNegotiationPoints || !aiNegotiationScript) return;
    const rawGoals = aiNegotiationGoalsInput?.value.trim() || '';
    const goals = rawGoals
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
      .slice(0, 6);
    if (goals.length === 0) {
      aiNegotiationStatus.textContent = 'Enter at least one negotiation goal (comma-separated).';
      return;
    }

    aiNegotiationStatus.textContent = 'Generating negotiation prep...';
    if (aiNegotiationSubmit) aiNegotiationSubmit.disabled = true;

    const response = await requestAiNegotiationPrep({
      goals,
      event_id: latestResults[0]?.id,
      session_id: pageState.sessionId || undefined,
      filters: readFiltersFromForm(),
      constraints: {
        max_price: parseFilterNumber(maxPriceInput?.value, 0, 10000),
        preferred_contact_channel: (
          profileChannelSelect?.value === 'email'
          || profileChannelSelect?.value === 'sms'
          || profileChannelSelect?.value === 'phone'
        ) ? profileChannelSelect.value : undefined,
      },
    });

    if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
      renderAiNegotiationPoints(aiNegotiationPoints, {
        talking_points: response.body.talking_points,
        suggested_concessions: response.body.suggested_concessions,
        red_flags: response.body.red_flags,
      });
      aiNegotiationScript.textContent = `Opening script: ${response.body.opening_script}`;
      aiNegotiationStatus.textContent = `${response.body.summary} (${response.body.telemetry.model_version})`;

      await trackEvent({
        event_name: 'ai_negotiation_prep_generated',
        properties: {
          goal_text: goals.join(', ').slice(0, 400),
          talking_point_count: response.body.talking_points.length,
          prompt_version: response.body.telemetry.prompt_version,
          model_version: response.body.telemetry.model_version,
          fallback_used: response.body.telemetry.fallback_used,
        },
      });
      if (response.body.telemetry.fallback_used) {
        await trackEvent({
          event_name: 'ai_fallback_triggered',
          properties: {
            feature: 'ai_negotiation_prep_assistant',
            reason: response.body.telemetry.fallback_reason ?? 'unknown',
            prompt_version: response.body.telemetry.prompt_version,
            model_version: response.body.telemetry.model_version,
          },
        });
      }
      if (response.body.quality?.sampled_for_review && response.body.quality.review_sample_id) {
        await trackEvent({
          event_name: 'ai_quality_sampled',
          properties: {
            feature: 'ai_negotiation_prep_assistant',
            sample_id: response.body.quality.review_sample_id,
            quality_score: response.body.quality.rubric.overall_score,
            quality_band: response.body.quality.rubric.band,
          },
        });
      }
    } else if (response.status === 422 && response.body && 'error' in response.body) {
      aiNegotiationStatus.textContent = response.body.error === 'unsafe_prompt'
        ? 'Negotiation goals blocked by safety filters. Rephrase and try again.'
        : 'Negotiation request failed validation.';
    } else if (response.status === 503) {
      aiNegotiationStatus.textContent = 'Negotiation prep assistant is not enabled in this environment.';
    } else {
      aiNegotiationStatus.textContent = 'Unable to generate negotiation prep right now.';
    }

    if (aiNegotiationSubmit) aiNegotiationSubmit.disabled = false;
  };

  const handleAiDocumentHelper = async (): Promise<void> => {
    if (!aiDocumentHelperEnabled || !aiDocumentStatus || !aiDocumentSummary || !aiDocumentChecklist) return;
    const documentText = aiDocumentText?.value.trim() || '';
    if (documentText.length < 40) {
      aiDocumentStatus.textContent = 'Paste a longer listing document excerpt (at least 40 characters).';
      return;
    }

    aiDocumentStatus.textContent = 'Analyzing document...';
    if (aiDocumentSubmit) aiDocumentSubmit.disabled = true;
    const response = await requestAiDocumentHelper({
      document_text: documentText,
      extraction_mode: 'summary_and_checklist',
      session_id: pageState.sessionId || undefined,
    });

    if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
      aiDocumentSummary.textContent = response.body.summary;
      renderAiDocumentChecklist(aiDocumentChecklist, response.body.checklist, response.body.action_items);
      aiDocumentStatus.textContent = `Document analysis ready (${response.body.telemetry.model_version}).`;

      await trackEvent({
        event_name: 'ai_document_helper_generated',
        properties: {
          document_length: documentText.length,
          checklist_count: response.body.checklist.length,
          prompt_version: response.body.telemetry.prompt_version,
          model_version: response.body.telemetry.model_version,
          fallback_used: response.body.telemetry.fallback_used,
        },
      });
      if (response.body.telemetry.fallback_used) {
        await trackEvent({
          event_name: 'ai_fallback_triggered',
          properties: {
            feature: 'ai_document_helper',
            reason: response.body.telemetry.fallback_reason ?? 'unknown',
            prompt_version: response.body.telemetry.prompt_version,
            model_version: response.body.telemetry.model_version,
          },
        });
      }
      if (response.body.quality?.sampled_for_review && response.body.quality.review_sample_id) {
        await trackEvent({
          event_name: 'ai_quality_sampled',
          properties: {
            feature: 'ai_document_helper',
            sample_id: response.body.quality.review_sample_id,
            quality_score: response.body.quality.rubric.overall_score,
            quality_band: response.body.quality.rubric.band,
          },
        });
      }
    } else if (response.status === 422 && response.body && 'error' in response.body) {
      aiDocumentStatus.textContent = response.body.error === 'unsafe_prompt'
        ? 'Document content blocked by safety filters. Rephrase and try again.'
        : 'Document helper request failed validation.';
    } else if (response.status === 503) {
      aiDocumentStatus.textContent = 'Document helper is not enabled in this environment.';
    } else {
      aiDocumentStatus.textContent = 'Unable to analyze document right now.';
    }

    if (aiDocumentSubmit) aiDocumentSubmit.disabled = false;
  };

  const handleAiFollowUpApprove = async (): Promise<void> => {
    if (!aiFollowUpEnabled || !aiFollowUpStatus) return;
    const recipient_id = aiFollowUpRecipientInput?.value.trim().toLowerCase() || '';
    const template_id = aiFollowUpTemplateSelect?.value || '';
    if (!recipient_id || !template_id) {
      aiFollowUpStatus.textContent = 'Enter recipient and template before approval.';
      return;
    }
    aiFollowUpStatus.textContent = 'Approving template...';
    if (aiFollowUpApprove) aiFollowUpApprove.disabled = true;
    const response = await requestAiFollowUpApprove({ recipient_id, template_id });
    if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
      aiFollowUpStatus.textContent = `Template approved (${response.body.approval.template_version}).`;
    } else if (response.status === 503) {
      aiFollowUpStatus.textContent = 'Follow-up automation is not enabled in this environment.';
    } else {
      aiFollowUpStatus.textContent = 'Unable to approve template right now.';
    }
    if (aiFollowUpApprove) aiFollowUpApprove.disabled = false;
  };

  const handleAiFollowUpAutomation = async (): Promise<void> => {
    if (!aiFollowUpEnabled || !aiFollowUpStatus || !aiFollowUpMessage) return;
    const recipient_id = aiFollowUpRecipientInput?.value.trim().toLowerCase() || '';
    const template_id = aiFollowUpTemplateSelect?.value || '';
    if (!recipient_id || !template_id) {
      aiFollowUpStatus.textContent = 'Enter recipient and template first.';
      return;
    }

    const eventTitle = latestResults[0]?.title ?? 'your shortlisted event';
    aiFollowUpStatus.textContent = 'Running follow-up automation...';
    if (aiFollowUpSubmit) aiFollowUpSubmit.disabled = true;
    const response = await requestAiFollowUpAutomation({
      recipient_id,
      template_id,
      event_title: eventTitle,
      next_step: 'send one-click inquiry and lock a schedule hold',
      session_id: pageState.sessionId || undefined,
    });

    if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
      aiFollowUpMessage.textContent = response.body.dispatch.message;
      aiFollowUpStatus.textContent = response.body.dispatch.status === 'suppressed'
        ? `Suppressed: ${response.body.dispatch.suppression_reason ?? 'unknown'}`
        : `Queued via ${response.body.dispatch.channel}.`;
      await trackEvent({
        event_name: 'ai_follow_up_automation_run',
        properties: {
          template_id,
          dispatch_status: response.body.dispatch.status,
          suppression_reason: response.body.dispatch.suppression_reason,
          channel: response.body.dispatch.channel,
        },
      });
    } else if (response.status === 503) {
      aiFollowUpStatus.textContent = 'Follow-up automation is not enabled in this environment.';
    } else if (response.status === 422 && response.body && 'error' in response.body) {
      aiFollowUpStatus.textContent = response.body.error === 'template_not_approved'
        ? 'Approve the template first, then run automation.'
        : `Follow-up request failed: ${response.body.error}`;
    } else {
      aiFollowUpStatus.textContent = 'Unable to run follow-up automation right now.';
    }

    if (aiFollowUpSubmit) aiFollowUpSubmit.disabled = false;
  };

  const handleAiNextBestAction = async (): Promise<void> => {
    if (!aiNextBestActionEnabled || !aiNextBestActionStatus || !aiNextBestActionList) return;
    const recipient_id = aiFollowUpRecipientInput?.value.trim().toLowerCase() || pageState.sessionId || '';
    const funnel_stage = (aiNextBestActionStageSelect?.value || 'consideration') as
      'discovery' | 'consideration' | 'negotiation' | 'ready_to_book' | 'post_inquiry';

    if (!recipient_id) {
      aiNextBestActionStatus.textContent = 'Enter a recipient id or run with an active session.';
      return;
    }

    aiNextBestActionStatus.textContent = 'Generating next-best actions...';
    if (aiNextBestActionSubmit) aiNextBestActionSubmit.disabled = true;

    const response = await requestAiNextBestAction({
      recipient_id,
      funnel_stage,
      event_id: latestResults[0]?.id,
      intent: queryInput?.value.trim(),
      session_id: pageState.sessionId || undefined,
      max_actions: 4,
      filters: readFiltersFromForm(),
    });

    if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
      renderAiNextBestActions(aiNextBestActionList, response.body.actions);
      aiNextBestActionStatus.textContent = `${response.body.summary} (${response.body.telemetry.model_version})`;
      await trackEvent({
        event_name: 'ai_next_best_action_generated',
        properties: {
          action_count: response.body.actions.length,
          funnel_stage,
          model_version: response.body.telemetry.model_version,
          suppressed_actions: response.body.actions.filter((action) => action.suppressed).length,
        },
      });
    } else if (response.status === 503) {
      aiNextBestActionStatus.textContent = 'Next-best-action is not enabled in this environment.';
    } else {
      aiNextBestActionStatus.textContent = 'Unable to generate next-best actions right now.';
    }

    if (aiNextBestActionSubmit) aiNextBestActionSubmit.disabled = false;
  };

  const resolveAiSuppressionRecipient = (): string => {
    const explicitRecipient = aiSuppressionRecipientInput?.value.trim().toLowerCase() || '';
    if (explicitRecipient) return explicitRecipient;
    const followUpRecipient = aiFollowUpRecipientInput?.value.trim().toLowerCase() || '';
    if (followUpRecipient) return followUpRecipient;
    return pageState.sessionId || '';
  };

  const applyAiSuppressionControlsToForm = (controls: AiSuppressionControls): void => {
    if (aiSuppressionRecipientInput) aiSuppressionRecipientInput.value = controls.recipient_id;
    if (aiSuppressionQuietStartInput) aiSuppressionQuietStartInput.value = String(controls.quiet_hours_start);
    if (aiSuppressionQuietEndInput) aiSuppressionQuietEndInput.value = String(controls.quiet_hours_end);
    if (aiSuppressionFrequencyCapInput) aiSuppressionFrequencyCapInput.value = String(controls.frequency_cap_per_day);
    if (aiSuppressionOptOutInput) aiSuppressionOptOutInput.checked = controls.opt_out;
  };

  const handleLoadAiSuppressionControls = async (): Promise<void> => {
    if (!aiSuppressionEnabled || !aiSuppressionStatus || !aiDispatchesList) return;
    const recipient_id = resolveAiSuppressionRecipient();
    if (!recipient_id) {
      aiSuppressionStatus.textContent = 'Enter a recipient id to load suppression controls.';
      return;
    }

    aiSuppressionStatus.textContent = `Loading suppression controls for ${recipient_id}...`;
    const controlsResponse = await requestAiSuppressionControls(recipient_id);
    if (
      controlsResponse.status !== 200
      || !controlsResponse.body
      || !('success' in controlsResponse.body)
      || !controlsResponse.body.success
    ) {
      aiSuppressionStatus.textContent = 'Unable to load suppression controls.';
      return;
    }
    applyAiSuppressionControlsToForm(controlsResponse.body.controls);

    const dispatchesResponse = await requestAiFollowUpDispatches(recipient_id);
    if (
      dispatchesResponse.status !== 200
      || !dispatchesResponse.body
      || !('success' in dispatchesResponse.body)
      || !dispatchesResponse.body.success
    ) {
      aiSuppressionStatus.textContent = `Loaded controls for ${recipient_id}; unable to load dispatches.`;
      renderAiFollowUpDispatches(aiDispatchesList, []);
      return;
    }
    renderAiFollowUpDispatches(aiDispatchesList, dispatchesResponse.body.items);
    aiSuppressionStatus.textContent = `Loaded controls + ${dispatchesResponse.body.items.length} dispatch(es) for ${recipient_id}.`;
  };

  const handleSaveAiSuppressionControls = async (): Promise<void> => {
    if (!aiSuppressionEnabled || !aiSuppressionStatus) return;
    const recipient_id = resolveAiSuppressionRecipient();
    if (!recipient_id) {
      aiSuppressionStatus.textContent = 'Enter a recipient id to save suppression controls.';
      return;
    }
    const quiet_hours_start = parseFilterNumber(aiSuppressionQuietStartInput?.value, 0, 23);
    const quiet_hours_end = parseFilterNumber(aiSuppressionQuietEndInput?.value, 0, 23);
    const frequency_cap_per_day = parseFilterNumber(aiSuppressionFrequencyCapInput?.value, 1, 20);
    if (
      typeof quiet_hours_start !== 'number'
      || typeof quiet_hours_end !== 'number'
      || typeof frequency_cap_per_day !== 'number'
    ) {
      aiSuppressionStatus.textContent = 'Quiet hours and frequency cap must be valid numbers.';
      return;
    }

    aiSuppressionStatus.textContent = `Saving suppression controls for ${recipient_id}...`;
    const response = await requestUpsertAiSuppressionControls({
      recipient_id,
      quiet_hours_start,
      quiet_hours_end,
      frequency_cap_per_day,
      opt_out: aiSuppressionOptOutInput?.checked ?? false,
    });
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      aiSuppressionStatus.textContent = 'Unable to save suppression controls.';
      return;
    }
    applyAiSuppressionControlsToForm(response.body.controls);
    aiSuppressionStatus.textContent = `Saved suppression controls for ${response.body.controls.recipient_id}.`;
    await handleLoadAiSuppressionControls();
  };

  const handleRefreshAiDispatches = async (): Promise<void> => {
    if (!aiSuppressionEnabled || !aiSuppressionStatus || !aiDispatchesList) return;
    const recipient_id = resolveAiSuppressionRecipient();
    if (!recipient_id) {
      aiSuppressionStatus.textContent = 'Enter a recipient id to load dispatches.';
      return;
    }
    aiSuppressionStatus.textContent = `Loading dispatches for ${recipient_id}...`;
    const response = await requestAiFollowUpDispatches(recipient_id);
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      aiSuppressionStatus.textContent = 'Unable to load dispatches.';
      renderAiFollowUpDispatches(aiDispatchesList, []);
      return;
    }
    renderAiFollowUpDispatches(aiDispatchesList, response.body.items);
    aiSuppressionStatus.textContent = `Loaded ${response.body.items.length} dispatch(es) for ${recipient_id}.`;
  };

  const loadAiReviewQueue = async (): Promise<void> => {
    if (
      !aiReviewSamplingEnabled
      || !aiReviewStatus
      || !aiReviewList
      || !aiReviewStatusFilter
    ) return;

    const selectedStatus = aiReviewStatusFilter.value;
    const statusFilter = (
      selectedStatus === 'all'
      || selectedStatus === 'pending'
      || selectedStatus === 'approved'
      || selectedStatus === 'needs_revision'
    ) ? selectedStatus : 'pending';

    const response = await requestAiReviewQueue();
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      aiReviewStatus.textContent = 'Unable to load AI review queue.';
      renderAiReviewQueue(aiReviewList, [], {
        onDecision: () => {},
      });
      return;
    }

    const filteredItems = statusFilter === 'all'
      ? response.body.items
      : response.body.items.filter((item) => item.status === statusFilter);

    renderAiReviewQueue(aiReviewList, filteredItems, {
      onDecision: (sample_id, decision) => {
        void (async () => {
          if (!aiReviewStatus) return;
          const reviewer = aiReviewReviewer?.value.trim();
          const notes = aiReviewNotes?.value.trim();
          aiReviewStatus.textContent = `Applying ${decision.replaceAll('_', ' ')} decision...`;
          const decisionResponse = await requestAiReviewDecision({
            sample_id,
            decision,
            ...(reviewer ? { reviewer } : {}),
            ...(notes ? { notes } : {}),
          });
          if (
            decisionResponse.status !== 200
            || !decisionResponse.body
            || !('success' in decisionResponse.body)
            || !decisionResponse.body.success
          ) {
            aiReviewStatus.textContent = 'Unable to apply AI review decision.';
            return;
          }
          aiReviewStatus.textContent = `Decision saved: ${sample_id} -> ${decisionResponse.body.item.status}.`;
          await loadAiReviewQueue();
        })();
      },
    });

    aiReviewStatus.textContent = statusFilter === 'all'
      ? `Loaded ${filteredItems.length} queue item(s).`
      : `Loaded ${filteredItems.length} ${statusFilter.replaceAll('_', ' ')} item(s) from ${response.body.items.length} total.`;
  };

  if (aiConciergeEnabled) {
    aiConciergeSubmit?.addEventListener('click', () => {
      void handleAiConcierge();
    });
  }
  if (aiShortlistEnabled) {
    aiShortlistSubmit?.addEventListener('click', () => {
      void handleAiShortlist();
    });
  }
  if (aiNegotiationEnabled) {
    aiNegotiationSubmit?.addEventListener('click', () => {
      void handleAiNegotiationPrep();
    });
  }
  if (aiDocumentHelperEnabled) {
    aiDocumentSubmit?.addEventListener('click', () => {
      void handleAiDocumentHelper();
    });
  }
  if (aiFollowUpEnabled) {
    aiFollowUpApprove?.addEventListener('click', () => {
      void handleAiFollowUpApprove();
    });
    aiFollowUpSubmit?.addEventListener('click', () => {
      void handleAiFollowUpAutomation();
    });
    void requestAiFollowUpTemplates().then((response) => {
      if (!aiFollowUpTemplateSelect) return;
      if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) return;
      while (aiFollowUpTemplateSelect.firstChild) aiFollowUpTemplateSelect.removeChild(aiFollowUpTemplateSelect.firstChild);
      for (const template of response.body.items) {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        aiFollowUpTemplateSelect.appendChild(option);
      }
    });
  }
  if (aiNextBestActionEnabled) {
    aiNextBestActionSubmit?.addEventListener('click', () => {
      void handleAiNextBestAction();
    });
  }
  if (aiSuppressionEnabled) {
    if (aiDispatchesList) renderAiFollowUpDispatches(aiDispatchesList, []);
    const seededRecipient = aiFollowUpRecipientInput?.value.trim().toLowerCase() || pageState.sessionId || '';
    if (aiSuppressionRecipientInput && !aiSuppressionRecipientInput.value.trim() && seededRecipient) {
      aiSuppressionRecipientInput.value = seededRecipient;
    }
    aiSuppressionLoad?.addEventListener('click', () => {
      void handleLoadAiSuppressionControls();
    });
    aiSuppressionSave?.addEventListener('click', () => {
      void handleSaveAiSuppressionControls();
    });
    aiDispatchesRefresh?.addEventListener('click', () => {
      void handleRefreshAiDispatches();
    });
    void handleLoadAiSuppressionControls();
  }
  if (aiReviewSamplingEnabled) {
    aiReviewRefresh?.addEventListener('click', () => {
      void loadAiReviewQueue();
    });
    aiReviewStatusFilter?.addEventListener('change', () => {
      void loadAiReviewQueue();
    });
    void loadAiReviewQueue();
  }

  const renderLatestResults = (): void => {
    renderSmartSearchResults(results, latestResults, {
      query_text: lastQueryText,
      filters: lastActiveFilters,
      experiment_assignments: lastExperimentAssignments,
      alerts_enabled: alertsEnabled,
      status,
      refreshSavedSearches,
      compare_enabled: compareEnabled,
      is_compared: (eventId: string) => selectedCompareIds.has(eventId),
      toggle_compare: (event) => {
        if (selectedCompareIds.has(event.id)) {
          selectedCompareIds.delete(event.id);
        } else if (selectedCompareIds.size >= SMART_SEARCH_MAX_COMPARE_ITEMS) {
          status.textContent = `Compare supports up to ${SMART_SEARCH_MAX_COMPARE_ITEMS} events at once.`;
          return;
        } else {
          selectedCompareIds.add(event.id);
        }
        renderLatestResults();
      },
      one_click_enabled: oneClickEnabled,
      scheduling_enabled: schedulingEnabled,
      on_create_inquiry: handleCreateInquiry,
      on_schedule_inquiry: handleScheduleInquiry,
    });
    refreshComparePanel();
  };

  const loadSavedSearchDeliveryAttemptHistory = async (item: SavedSearchItem): Promise<void> => {
    if (!savedSearchAlertOpsStatus || !savedSearchAlertAttempts) return;
    savedSearchAlertOpsStatus.textContent = `Loading delivery attempts for alert ${item.id}...`;
    const response = await requestSavedSearchDeliveryAttempts(item.id);
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      savedSearchAlertOpsStatus.textContent = `Unable to load delivery attempts for alert ${item.id}.`;
      renderSavedSearchDeliveryAttempts(savedSearchAlertAttempts, []);
      return;
    }
    renderSavedSearchDeliveryAttempts(savedSearchAlertAttempts, response.body.items);
    savedSearchAlertOpsStatus.textContent = `Loaded ${response.body.items.length} delivery attempt(s) for alert ${item.id}.`;
  };

  const refreshSavedSearches = async () => {
    if (!alertsEnabled) return;
    if (savedSearchAlertAttempts) renderSavedSearchDeliveryAttempts(savedSearchAlertAttempts, []);
    await loadSavedSearches(savedList, {
      onSendAlert: (item) => {
        void (async () => {
          if (!savedSearchAlertOpsStatus) return;
          savedSearchAlertOpsStatus.textContent = `Sending alert ${item.id}...`;
          const response = await requestSendSavedSearchAlert(item.id);
          if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
            savedSearchAlertOpsStatus.textContent = `Alert ${item.id} sent via ${response.body.selected_channel} (${response.body.provider}).`;
          } else if (response.body && 'success' in response.body && !response.body.success) {
            savedSearchAlertOpsStatus.textContent = `Alert ${item.id} failed: ${response.body.error ?? 'provider_error'}.`;
          } else {
            savedSearchAlertOpsStatus.textContent = `Unable to send alert ${item.id}.`;
          }
          await loadSavedSearchDeliveryAttemptHistory(item);
        })();
      },
      onViewAttempts: (item) => {
        void loadSavedSearchDeliveryAttemptHistory(item);
      },
    });
  };
  void refreshSavedSearches();

  const loadFraudOpsDashboard = async (): Promise<void> => {
    if (!fraudRiskEnabled || !fraudOpsDashboard || !fraudOpsMetrics) return;
    try {
      const response = await fetch('/api/fraud/dashboard', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        fraudOpsMetrics.textContent = 'Unable to load fraud dashboard right now.';
        return;
      }
      const payload = await response.json() as FraudOpsDashboardResponse;
      renderFraudOpsDashboardMetrics(fraudOpsMetrics, payload);
    } catch {
      fraudOpsMetrics.textContent = 'Unable to load fraud dashboard right now.';
    }
  };

  const loadFraudReviewQueue = async (): Promise<void> => {
    if (
      !fraudRiskEnabled
      || !fraudReviewStatus
      || !fraudReviewList
      || !fraudReviewStatusFilter
    ) return;

    const selectedStatus = fraudReviewStatusFilter.value;
    const queueStatus = (
      selectedStatus === 'all'
      || selectedStatus === 'pending'
      || selectedStatus === 'cleared'
      || selectedStatus === 'confirmed_fraud'
      || selectedStatus === 'false_positive'
    ) ? selectedStatus : 'pending';
    const limit = parseFilterNumber(fraudReviewLimit?.value, 1, 25) ?? 5;

    const response = await requestFraudReviewQueue({
      status: queueStatus,
      limit,
    });
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      fraudReviewStatus.textContent = 'Unable to load fraud review queue.';
      renderFraudReviewQueueList(fraudReviewList, [], {
        onDecision: () => {},
      });
      return;
    }

    renderFraudReviewQueueList(fraudReviewList, response.body.items, {
      onDecision: (event_id, decision) => {
        void (async () => {
          if (!fraudReviewStatus) return;
          const reviewer = fraudReviewReviewer?.value.trim();
          const notes = fraudReviewNotes?.value.trim();
          fraudReviewStatus.textContent = `Applying ${decision.replaceAll('_', ' ')} decision...`;
          const decisionResponse = await requestFraudReviewDecision({
            event_id,
            decision,
            ...(reviewer ? { reviewer } : {}),
            ...(notes ? { notes } : {}),
          });
          if (
            decisionResponse.status !== 200
            || !decisionResponse.body
            || !('success' in decisionResponse.body)
            || !decisionResponse.body.success
          ) {
            fraudReviewStatus.textContent = 'Unable to apply fraud decision.';
            return;
          }
          fraudReviewStatus.textContent = `Decision saved: ${event_id} -> ${decisionResponse.body.item.status}.`;
          await loadFraudReviewQueue();
          await loadFraudOpsDashboard();
        })();
      },
    });
    fraudReviewStatus.textContent = `Loaded ${response.body.items.length} queue item(s).`;
  };

  if (fraudRiskEnabled) {
    fraudOpsRefresh?.addEventListener('click', () => {
      void loadFraudOpsDashboard();
    });
    fraudReviewRefresh?.addEventListener('click', () => {
      void loadFraudReviewQueue();
    });
    fraudReviewStatusFilter?.addEventListener('change', () => {
      void loadFraudReviewQueue();
    });
    void loadFraudOpsDashboard();
    void loadFraudReviewQueue();
  }

  const loadInsightsHub = async (): Promise<void> => {
    if (!insightsHubEnabled || !insightsHubSummary) return;
    const response = await requestInsightsHub(14);
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      insightsHubSummary.textContent = 'Unable to load insights hub right now.';
      return;
    }
    renderInsightsHubSummary(insightsHubSummary, response.body);
    await trackEvent({
      event_name: 'insights_hub_view',
      properties: {
        window_days: response.body.summary.window_days,
        trend_direction: response.body.summary.trend_direction,
        total_events: response.body.summary.total_events,
      },
    });
  };

  if (insightsHubEnabled) {
    insightsHubRefresh?.addEventListener('click', () => {
      void loadInsightsHub();
    });
    void loadInsightsHub();
  }

  const loadUserDashboards = async (): Promise<void> => {
    if (!userDashboardsEnabled || !userDashboardsOwnerId || !userDashboardsList || !userDashboardsStatus) return;
    const owner_id = userDashboardsOwnerId.value.trim().toLowerCase();
    if (!owner_id) {
      userDashboardsStatus.textContent = 'Enter an owner id to load dashboards.';
      renderUserDashboardsList(userDashboardsList, [], {
        onDelete: () => {},
      });
      return;
    }

    const response = await requestUserDashboards(owner_id);
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      userDashboardsStatus.textContent = 'Unable to load dashboards right now.';
      renderUserDashboardsList(userDashboardsList, [], {
        onDelete: () => {},
      });
      return;
    }

    renderUserDashboardsList(userDashboardsList, response.body.items, {
      onDelete: (dashboard_id) => {
        void (async () => {
          const removed = await requestDeleteUserDashboard({ owner_id, dashboard_id });
          if (removed.status !== 200 || !removed.body || !('success' in removed.body) || !removed.body.success) {
            userDashboardsStatus.textContent = 'Unable to delete dashboard right now.';
            return;
          }
          userDashboardsStatus.textContent = `Deleted dashboard ${dashboard_id}.`;
          await loadUserDashboards();
        })();
      },
    });
    userDashboardsStatus.textContent = `Loaded ${response.body.items.length} dashboard(s) for ${owner_id}.`;
  };

  const handleSaveUserDashboard = async (): Promise<void> => {
    if (
      !userDashboardsEnabled
      || !userDashboardsOwnerId
      || !userDashboardsName
      || !userDashboardsMetric
      || !userDashboardsVisualization
      || !userDashboardsWindowDays
      || !userDashboardsStatus
    ) return;

    const owner_id = userDashboardsOwnerId.value.trim().toLowerCase();
    const name = userDashboardsName.value.trim();
    const metric = userDashboardsMetric.value;
    const visualization = userDashboardsVisualization.value;
    const parsedWindowDays = Number(userDashboardsWindowDays.value);
    const window_days = Number.isFinite(parsedWindowDays) ? Math.max(1, Math.min(90, Math.round(parsedWindowDays))) : 14;

    const validMetric = (
      metric === 'search_queries'
      || metric === 'search_clicks'
      || metric === 'inquiries_submitted'
      || metric === 'schedules_confirmed'
      || metric === 'ai_conversions'
    ) ? metric : null;
    const validVisualization = (
      visualization === 'kpi'
      || visualization === 'line'
      || visualization === 'bar'
    ) ? visualization : null;

    if (!owner_id || !name || !validMetric || !validVisualization) {
      userDashboardsStatus.textContent = 'Owner id, name, metric, and visualization are required.';
      return;
    }

    const response = await requestSaveUserDashboard({
      owner_id,
      name,
      metric: validMetric,
      visualization: validVisualization,
      window_days,
    });

    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      userDashboardsStatus.textContent = 'Unable to save dashboard right now.';
      return;
    }

    userDashboardsStatus.textContent = `Saved dashboard ${response.body.item.name}.`;
    await loadUserDashboards();
  };

  if (userDashboardsEnabled) {
    userDashboardsRefresh?.addEventListener('click', () => {
      void loadUserDashboards();
    });
    userDashboardsSave?.addEventListener('click', () => {
      void handleSaveUserDashboard();
    });
    void loadUserDashboards();
  }

  const loadExperimentControls = async (): Promise<void> => {
    if (!experimentationEnabled || !experimentationSummary || !experimentationStatus) return;
    const response = await requestExperimentStatus();
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      experimentationStatus.textContent = 'Unable to load experiment status right now.';
      renderExperimentSummary(experimentationSummary, []);
      return;
    }
    renderExperimentSummary(experimentationSummary, response.body.items);
    experimentationStatus.textContent = `Loaded ${response.body.items.length} experiment(s).`;
  };

  const handleExperimentRollback = async (): Promise<void> => {
    if (!experimentationEnabled || !experimentationId || !experimentationStatus) return;
    const selected = experimentationId.value;
    const experimentId = (
      selected === 'ranking_blend_v1'
      || selected === 'trust_controls_v1'
    ) ? selected : null;
    if (!experimentId) {
      experimentationStatus.textContent = 'Select a valid experiment id.';
      return;
    }
    const reason = experimentationRollbackReason?.value.trim();
    const response = await requestExperimentRollback({
      id: experimentId,
      ...(reason ? { reason } : {}),
    });
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      experimentationStatus.textContent = 'Rollback request failed.';
      return;
    }
    experimentationStatus.textContent = `Rollback applied to ${response.body.item.id}.`;
    await loadExperimentControls();
  };

  if (experimentationEnabled) {
    experimentationRefresh?.addEventListener('click', () => {
      void loadExperimentControls();
    });
    experimentationRollback?.addEventListener('click', () => {
      void handleExperimentRollback();
    });
    void loadExperimentControls();
  }

  const readAvailabilityOpsInput = (): {
    event_id: string;
    status?: AvailabilityOpsStatus;
    seats_total?: number;
    seats_remaining?: number;
    provider: string;
    token: string;
  } | null => {
    if (!availabilitySyncEventId || !availabilitySyncProvider || !availabilitySyncToken) return null;
    const event_id = availabilitySyncEventId.value.trim();
    const provider = availabilitySyncProvider.value.trim().toLowerCase();
    const token = availabilitySyncToken.value.trim();
    const statusRaw = availabilitySyncStatus?.value.trim();
    const status = (
      statusRaw === 'available'
      || statusRaw === 'limited'
      || statusRaw === 'sold_out'
    ) ? statusRaw : undefined;
    const seats_total = parseFilterNumber(availabilitySyncSeatsTotal?.value, 1, 100000);
    const seats_remaining = parseFilterNumber(availabilitySyncSeatsRemaining?.value, 0, 100000);
    return {
      event_id,
      provider,
      token,
      ...(status ? { status } : {}),
      ...(typeof seats_total === 'number' ? { seats_total } : {}),
      ...(typeof seats_remaining === 'number' ? { seats_remaining } : {}),
    };
  };

  const handleAvailabilitySync = async (): Promise<void> => {
    if (!availabilitySyncEnabled || !availabilitySyncStatusText || !availabilitySyncResponse) return;
    const input = readAvailabilityOpsInput();
    if (!input || !input.event_id) {
      availabilitySyncStatusText.textContent = 'Event id is required.';
      return;
    }
    if (!input.status && typeof input.seats_total !== 'number' && typeof input.seats_remaining !== 'number') {
      availabilitySyncStatusText.textContent = 'Provide status and/or seat counts.';
      return;
    }

    availabilitySyncStatusText.textContent = 'Syncing availability update...';
    if (availabilitySyncSubmit) availabilitySyncSubmit.disabled = true;
    const response = await requestAvailabilitySync({
      updates: [{
        event_id: input.event_id,
        ...(input.status ? { status: input.status } : {}),
        ...(typeof input.seats_total === 'number' ? { seats_total: input.seats_total } : {}),
        ...(typeof input.seats_remaining === 'number' ? { seats_remaining: input.seats_remaining } : {}),
      }],
    });
    renderAvailabilityOpsResponse(availabilitySyncResponse, response.body);

    if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
      availabilitySyncStatusText.textContent = `Synced ${response.body.processed} availability update(s).`;
    } else if (response.body && 'error' in response.body) {
      availabilitySyncStatusText.textContent = `Availability sync failed: ${response.body.error}`;
    } else {
      availabilitySyncStatusText.textContent = 'Availability sync request failed.';
    }
    if (availabilitySyncSubmit) availabilitySyncSubmit.disabled = false;
  };

  const handleAvailabilityWebhook = async (): Promise<void> => {
    if (!availabilitySyncEnabled || !availabilitySyncStatusText || !availabilitySyncResponse) return;
    const input = readAvailabilityOpsInput();
    if (!input || !input.event_id || !input.provider || !input.token) {
      availabilitySyncStatusText.textContent = 'Event id, provider, and webhook token are required.';
      return;
    }
    if (!input.status && typeof input.seats_total !== 'number' && typeof input.seats_remaining !== 'number') {
      availabilitySyncStatusText.textContent = 'Provide status and/or seat counts.';
      return;
    }

    availabilitySyncStatusText.textContent = 'Posting provider webhook update...';
    if (availabilityWebhookSubmit) availabilityWebhookSubmit.disabled = true;
    const response = await requestAvailabilityWebhook({
      provider: input.provider,
      token: input.token,
      records: [{
        id: input.event_id,
        ...(input.status ? { availability: input.status } : {}),
        ...((typeof input.seats_total === 'number' || typeof input.seats_remaining === 'number')
          ? {
            seats: {
              ...(typeof input.seats_total === 'number' ? { total: input.seats_total } : {}),
              ...(typeof input.seats_remaining === 'number' ? { remaining: input.seats_remaining } : {}),
            },
          }
          : {}),
      }],
      sent_at: new Date().toISOString(),
    });
    renderAvailabilityOpsResponse(availabilitySyncResponse, response.body);

    if (response.status === 200 && response.body && 'success' in response.body && response.body.success) {
      availabilitySyncStatusText.textContent = `Webhook accepted by ${response.body.provider}.`;
    } else if (response.body && 'error' in response.body) {
      availabilitySyncStatusText.textContent = `Availability webhook failed: ${response.body.error}`;
    } else {
      availabilitySyncStatusText.textContent = 'Availability webhook request failed.';
    }
    if (availabilityWebhookSubmit) availabilityWebhookSubmit.disabled = false;
  };

  if (availabilitySyncEnabled) {
    if (availabilitySyncResponse) renderAvailabilityOpsResponse(availabilitySyncResponse, null);
    availabilitySyncSubmit?.addEventListener('click', () => {
      void handleAvailabilitySync();
    });
    availabilityWebhookSubmit?.addEventListener('click', () => {
      void handleAvailabilityWebhook();
    });
  }

  const resetWebhookOpsForm = (): void => {
    if (webhookOpsPartnerId && !webhookOpsPartnerId.value.trim()) webhookOpsPartnerId.value = 'partner-a';
    if (webhookOpsEventType && !webhookOpsEventType.value.trim()) webhookOpsEventType.value = 'booking.created';
    if (webhookOpsEventId && !webhookOpsEventId.value.trim()) webhookOpsEventId.value = `evt_smoke_${Date.now().toString(36)}`;
    if (webhookOpsTimestamp) webhookOpsTimestamp.value = String(Date.now());
    if (webhookOpsNonce) webhookOpsNonce.value = generateWebhookNonce();
    if (webhookOpsPayload && !webhookOpsPayload.value.trim()) {
      webhookOpsPayload.value = JSON.stringify({
        booking_id: `bk_${Date.now().toString(36)}`,
        amount: 120,
      });
    }
  };

  const handleWebhookDispatch = async (): Promise<void> => {
    if (
      !webhookAccessEnabled
      || !webhookOpsStatus
      || !webhookOpsResponse
      || !webhookOpsPartnerId
      || !webhookOpsSharedSecret
      || !webhookOpsEventId
      || !webhookOpsEventType
      || !webhookOpsPayload
    ) return;

    const partner = webhookOpsPartnerId.value.trim().toLowerCase();
    const shared_secret = webhookOpsSharedSecret.value.trim();
    const event_id = webhookOpsEventId.value.trim();
    const event_type = webhookOpsEventType.value.trim();
    const timestamp = webhookOpsTimestamp?.value.trim() || String(Date.now());
    const nonce = webhookOpsNonce?.value.trim() || generateWebhookNonce();

    if (webhookOpsTimestamp) webhookOpsTimestamp.value = timestamp;
    if (webhookOpsNonce) webhookOpsNonce.value = nonce;

    if (!partner || !shared_secret || !event_id || !event_type) {
      webhookOpsStatus.textContent = 'Partner, shared secret, event id, and event type are required.';
      return;
    }

    let event_payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(webhookOpsPayload.value.trim() || '{}') as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        webhookOpsStatus.textContent = 'Payload JSON must be an object.';
        return;
      }
      event_payload = parsed as Record<string, unknown>;
    } catch {
      webhookOpsStatus.textContent = 'Payload JSON is invalid.';
      return;
    }

    webhookOpsStatus.textContent = 'Dispatching signed webhook...';
    if (webhookOpsSend) webhookOpsSend.disabled = true;
    const response = await requestSignedWebhookEvent({
      partner,
      shared_secret,
      event_id,
      event_type,
      event_payload,
      timestamp,
      nonce,
    });
    renderWebhookOpsResponse(webhookOpsResponse, response.body);

    if (response.status === 202 && response.body && 'success' in response.body && response.body.success) {
      webhookOpsStatus.textContent = `Webhook accepted (${response.body.delivery_id}).`;
    } else if (response.status === 401 || response.status === 409 || response.status === 422 || response.status === 503) {
      webhookOpsStatus.textContent = response.body && 'error' in response.body
        ? `Webhook rejected: ${response.body.error}`
        : `Webhook rejected with status ${response.status}.`;
    } else {
      webhookOpsStatus.textContent = 'Unable to dispatch webhook right now.';
    }

    if (webhookOpsSend) webhookOpsSend.disabled = false;
    if (webhookOpsTimestamp) webhookOpsTimestamp.value = String(Date.now());
    if (webhookOpsNonce) webhookOpsNonce.value = generateWebhookNonce();
  };

  if (webhookAccessEnabled) {
    resetWebhookOpsForm();
    if (webhookOpsResponse) renderWebhookOpsResponse(webhookOpsResponse, null);
    webhookOpsReset?.addEventListener('click', () => {
      if (webhookOpsEventId) webhookOpsEventId.value = '';
      if (webhookOpsPayload) webhookOpsPayload.value = '';
      resetWebhookOpsForm();
      if (webhookOpsStatus) webhookOpsStatus.textContent = 'Webhook defaults reset.';
      if (webhookOpsResponse) renderWebhookOpsResponse(webhookOpsResponse, null);
    });
    webhookOpsSend?.addEventListener('click', () => {
      void handleWebhookDispatch();
    });
  }

  const loadPartnerOps = async (): Promise<void> => {
    if (
      !partnerRolesEnabled
      || !whiteLabelEnabled
      || !partnerOpsSummary
      || !partnerOpsAssignments
      || !partnerOpsPortalConfig
    ) return;
    const workspace_id = partnerOpsWorkspaceId?.value.trim().toLowerCase() || 'pilot_workspace';
    if (partnerOpsWorkspaceId && !partnerOpsWorkspaceId.value.trim()) partnerOpsWorkspaceId.value = workspace_id;
    const tenant_id = partnerOpsTenantId?.value.trim().toLowerCase() || workspace_id;
    if (partnerOpsTenantId && !partnerOpsTenantId.value.trim()) partnerOpsTenantId.value = tenant_id;
    if (partnerOpsStatus) partnerOpsStatus.textContent = 'Loading partner ops...';
    const [rolesResponse, pilotResponse, portalResponse] = await Promise.all([
      requestPartnerRoles(workspace_id),
      requestPartnerPilot(),
      requestPartnerPortalConfig(tenant_id),
    ]);
    if (
      rolesResponse.status !== 200
      || pilotResponse.status !== 200
      || portalResponse.status !== 200
      || !rolesResponse.body
      || !pilotResponse.body
      || !portalResponse.body
      || !('success' in rolesResponse.body)
      || !('success' in pilotResponse.body)
      || !('success' in portalResponse.body)
      || !rolesResponse.body.success
      || !pilotResponse.body.success
      || !portalResponse.body.success
    ) {
      partnerOpsSummary.textContent = 'Unable to load partner ops right now.';
      renderPartnerAssignments(partnerOpsAssignments, [], []);
      renderPartnerPortalConfig(partnerOpsPortalConfig, null);
      if (partnerOpsStatus) partnerOpsStatus.textContent = 'Unable to load partner ops right now.';
      return;
    }
    const selectedRoleId = partnerOpsRoleId?.value || '';
    if (partnerOpsRoleId) {
      while (partnerOpsRoleId.firstChild) partnerOpsRoleId.removeChild(partnerOpsRoleId.firstChild);
      for (const template of rolesResponse.body.role_templates) {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        partnerOpsRoleId.appendChild(option);
      }
      const fallbackRole = rolesResponse.body.role_templates[0]?.id;
      if (selectedRoleId && rolesResponse.body.role_templates.some((template: { id: string }) => template.id === selectedRoleId)) {
        partnerOpsRoleId.value = selectedRoleId;
      } else if (fallbackRole) {
        partnerOpsRoleId.value = fallbackRole;
      }
    }

    renderPartnerOpsSummary(partnerOpsSummary, {
      roles: rolesResponse.body,
      pilot: pilotResponse.body,
      portal: portalResponse.body.config,
    });
    renderPartnerAssignments(partnerOpsAssignments, rolesResponse.body.assignments, rolesResponse.body.role_templates);
    renderPartnerPortalConfig(partnerOpsPortalConfig, portalResponse.body.config);

    if (partnerOpsBrandName) partnerOpsBrandName.value = portalResponse.body.config.brand_name;
    if (partnerOpsPrimaryColor) partnerOpsPrimaryColor.value = portalResponse.body.config.theme.primary_color;
    if (partnerOpsAccentColor) partnerOpsAccentColor.value = portalResponse.body.config.theme.accent_color;
    if (partnerOpsLogoUrl) partnerOpsLogoUrl.value = portalResponse.body.config.theme.logo_url ?? '';
    if (partnerOpsFeatureOverrides) {
      partnerOpsFeatureOverrides.value = JSON.stringify(portalResponse.body.config.feature_overrides, null, 2);
    }

    const activePhase = pilotResponse.body.phases.find(
      (phase: { status: 'pending' | 'in_progress' | 'completed' }) => phase.status === 'in_progress',
    ) ?? pilotResponse.body.phases[0];
    if (partnerOpsPhase && activePhase) partnerOpsPhase.value = activePhase.phase;
    if (partnerOpsPhaseStatus && activePhase) partnerOpsPhaseStatus.value = activePhase.status;
    if (partnerOpsStatus) partnerOpsStatus.textContent = `Loaded partner ops for ${workspace_id} / ${tenant_id}.`;
    await trackEvent({
      event_name: 'partner_ops_view',
      properties: {
        workspace_id: rolesResponse.body.workspace_id,
        tenant_id: portalResponse.body.config.tenant_id,
        active_phase: activePhase?.phase ?? 'sandbox_validation',
        role_template_count: rolesResponse.body.role_templates.length,
      },
    });
  };

  if (partnerRolesEnabled && whiteLabelEnabled) {
    if (partnerOpsPortalConfig) renderPartnerPortalConfig(partnerOpsPortalConfig, null);
    const handleAssignPartnerRole = async (): Promise<void> => {
      if (!partnerOpsStatus) return;
      const workspace_id = partnerOpsWorkspaceId?.value.trim().toLowerCase() || 'pilot_workspace';
      const member_id = partnerOpsMemberId?.value.trim().toLowerCase() || '';
      const roleValue = partnerOpsRoleId?.value || '';
      const role_id = (
        roleValue === 'workspace_admin'
        || roleValue === 'ops_manager'
        || roleValue === 'analyst'
        || roleValue === 'support_agent'
        || roleValue === 'viewer'
      ) ? roleValue : null;
      if (!member_id || !role_id) {
        partnerOpsStatus.textContent = 'Workspace, member, and role are required.';
        return;
      }
      const assigned_by = partnerOpsAssignedBy?.value.trim();
      partnerOpsStatus.textContent = `Assigning ${role_id} to ${member_id}...`;
      const response = await requestAssignPartnerRole({
        workspace_id,
        member_id,
        role_id,
        ...(assigned_by ? { assigned_by } : {}),
      });
      if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
        partnerOpsStatus.textContent = 'Unable to assign partner role.';
        return;
      }
      partnerOpsStatus.textContent = `Assigned ${response.body.assignment.role_id} to ${response.body.assignment.member_id}.`;
      await loadPartnerOps();
    };

    const handleLoadPartnerPortal = async (): Promise<void> => {
      if (!partnerOpsStatus || !partnerOpsPortalConfig) return;
      const workspace_id = partnerOpsWorkspaceId?.value.trim().toLowerCase() || 'pilot_workspace';
      const tenant_id = partnerOpsTenantId?.value.trim().toLowerCase() || workspace_id;
      if (partnerOpsTenantId && !partnerOpsTenantId.value.trim()) partnerOpsTenantId.value = tenant_id;
      partnerOpsStatus.textContent = `Loading portal config for ${tenant_id}...`;
      const response = await requestPartnerPortalConfig(tenant_id);
      if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
        partnerOpsStatus.textContent = 'Unable to load portal config.';
        return;
      }
      if (partnerOpsBrandName) partnerOpsBrandName.value = response.body.config.brand_name;
      if (partnerOpsPrimaryColor) partnerOpsPrimaryColor.value = response.body.config.theme.primary_color;
      if (partnerOpsAccentColor) partnerOpsAccentColor.value = response.body.config.theme.accent_color;
      if (partnerOpsLogoUrl) partnerOpsLogoUrl.value = response.body.config.theme.logo_url ?? '';
      if (partnerOpsFeatureOverrides) {
        partnerOpsFeatureOverrides.value = JSON.stringify(response.body.config.feature_overrides, null, 2);
      }
      renderPartnerPortalConfig(partnerOpsPortalConfig, response.body.config);
      partnerOpsStatus.textContent = `Loaded portal config for ${response.body.config.tenant_id}.`;
      await loadPartnerOps();
    };

    const handleSavePartnerPortal = async (): Promise<void> => {
      if (!partnerOpsStatus || !partnerOpsPortalConfig) return;
      const workspace_id = partnerOpsWorkspaceId?.value.trim().toLowerCase() || 'pilot_workspace';
      const tenant_id = partnerOpsTenantId?.value.trim().toLowerCase() || workspace_id;
      if (!tenant_id) {
        partnerOpsStatus.textContent = 'Tenant id is required.';
        return;
      }

      const featureOverridesText = partnerOpsFeatureOverrides?.value.trim() || '{}';
      let feature_overrides: Record<string, boolean> = {};
      try {
        const parsed = JSON.parse(featureOverridesText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          partnerOpsStatus.textContent = 'Feature overrides must be a JSON object.';
          return;
        }
        const nextOverrides: Record<string, boolean> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value !== 'boolean') {
            partnerOpsStatus.textContent = `Feature override "${key}" must be true or false.`;
            return;
          }
          nextOverrides[key] = value;
        }
        feature_overrides = nextOverrides;
      } catch {
        partnerOpsStatus.textContent = 'Feature overrides JSON is invalid.';
        return;
      }

      const brand_name = partnerOpsBrandName?.value.trim();
      const primary_color = partnerOpsPrimaryColor?.value.trim();
      const accent_color = partnerOpsAccentColor?.value.trim();
      const logo_url = partnerOpsLogoUrl?.value.trim();

      partnerOpsStatus.textContent = `Saving portal config for ${tenant_id}...`;
      const response = await requestUpdatePartnerPortalConfig({
        tenant_id,
        ...(brand_name ? { brand_name } : {}),
        theme: {
          ...(primary_color ? { primary_color } : {}),
          ...(accent_color ? { accent_color } : {}),
          ...(logo_url ? { logo_url } : {}),
        },
        feature_overrides,
      });
      if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
        partnerOpsStatus.textContent = 'Unable to save portal config.';
        return;
      }
      renderPartnerPortalConfig(partnerOpsPortalConfig, response.body.config);
      partnerOpsStatus.textContent = `Saved portal config for ${response.body.config.tenant_id}.`;
      await loadPartnerOps();
    };

    const handleUpdatePartnerPhase = async (): Promise<void> => {
      if (!partnerOpsStatus) return;
      const phaseValue = partnerOpsPhase?.value || '';
      const statusValue = partnerOpsPhaseStatus?.value || '';
      const phase = (
        phaseValue === 'sandbox_validation'
        || phaseValue === 'staging_dry_run'
        || phaseValue === 'limited_production'
        || phaseValue === 'general_availability'
      ) ? phaseValue : null;
      const phaseStatus = (
        statusValue === 'pending'
        || statusValue === 'in_progress'
        || statusValue === 'completed'
      ) ? statusValue : null;
      if (!phase || !phaseStatus) {
        partnerOpsStatus.textContent = 'Select a valid phase and status.';
        return;
      }
      partnerOpsStatus.textContent = `Updating ${phase} to ${phaseStatus}...`;
      const response = await requestUpdatePartnerPilot({ phase, status: phaseStatus });
      if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
        partnerOpsStatus.textContent = 'Unable to update rollout phase.';
        return;
      }
      partnerOpsStatus.textContent = `Updated ${response.body.phase.phase} to ${response.body.phase.status}.`;
      await loadPartnerOps();
    };

    partnerOpsRefresh?.addEventListener('click', () => {
      void loadPartnerOps();
    });
    partnerOpsAssignRole?.addEventListener('click', () => {
      void handleAssignPartnerRole();
    });
    partnerOpsLoadPortal?.addEventListener('click', () => {
      void handleLoadPartnerPortal();
    });
    partnerOpsSavePortal?.addEventListener('click', () => {
      void handleSavePartnerPortal();
    });
    partnerOpsUpdatePhase?.addEventListener('click', () => {
      void handleUpdatePartnerPhase();
    });
    void loadPartnerOps();
  }

  if (dynamicFilterBuilderEnabled) {
    const updateFilterChipState = () => {
      if (!filterChipList) return;
      renderActiveFilterChips(filterChipList, readFiltersFromForm(), clearFilterByKey);
    };
    const filterInputs: Array<HTMLInputElement | HTMLSelectElement | null> = [
      boroughSelect,
      categorySelect,
      maxPriceInput,
      startsBeforeInput,
      withinWalkInput,
    ];
    for (const input of filterInputs) {
      input?.addEventListener('change', updateFilterChipState);
      input?.addEventListener('input', updateFilterChipState);
    }
    clearFiltersBtn?.addEventListener('click', () => {
      applyFiltersToForm({});
      updateFilterChipState();
      status.textContent = 'Filter selections cleared.';
    });
    savePresetBtn?.addEventListener('click', () => {
      const filters = readFiltersFromForm();
      if (!hasActiveFilters(filters)) {
        status.textContent = 'Add at least one filter before saving a preset.';
        return;
      }

      const providedName = presetNameInput?.value.trim();
      const defaultName = `Preset ${filterPresets.length + 1}`;
      const name = (providedName || defaultName).slice(0, 30);
      const nextPreset: SmartSearchFilterPreset = {
        id: `flt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        filters,
      };
      filterPresets = [nextPreset, ...filterPresets].slice(0, SMART_SEARCH_MAX_PRESETS);
      writeSmartSearchFilterPresets(filterPresets);
      if (presetNameInput) presetNameInput.value = '';
      refreshFilterBuilderUI();
      status.textContent = `Saved preset "${name}".`;
    });
    refreshFilterBuilderUI();
  }

  const setSelectValueIfAvailable = (select: HTMLSelectElement | null, value: string | undefined): void => {
    if (!select) return;
    if (!value) {
      select.value = '';
      return;
    }
    if (Array.from(select.options).some((option) => option.value === value)) {
      select.value = value;
    }
  };

  for (const button of quickTemplateButtons) {
    button.addEventListener('click', () => {
      const query = button.dataset.smartQueryTemplate?.trim();
      if (!query || !queryInput) return;
      queryInput.value = query;
      setSelectValueIfAvailable(boroughSelect, button.dataset.smartTemplateBorough);
      setSelectValueIfAvailable(categorySelect, button.dataset.smartTemplateCategory);
      const startsBefore = parseFilterNumber(button.dataset.smartTemplateStartsBeforeHour, 0, 23);
      if (startsBeforeInput) {
        startsBeforeInput.value = typeof startsBefore === 'number' ? String(startsBefore) : '';
      }
      form.requestSubmit();
    });
  }

  runLastSearchButton?.addEventListener('click', () => {
    if (!lastSearchRequest) {
      status.textContent = 'No previous search available yet.';
      return;
    }
    applyStoredSearchRequest(lastSearchRequest);
    if (dynamicFilterBuilderEnabled && filterChipList) {
      renderActiveFilterChips(filterChipList, readFiltersFromForm(), clearFilterByKey);
    }
    form.requestSubmit();
  });

  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const query = queryInput?.value.trim() ?? '';
    if (!query) {
      syncSearchStateToUrl('', {});
      status.textContent = 'Enter a search query first.';
      clearSmartSearchResults(results);
      if (comparePanel) comparePanel.hidden = true;
      return;
    }

    const payload: SmartSearchRequest = {
      query,
      session_id: pageState.sessionId || undefined,
      limit: 6,
    };

    const activeFilters = readFiltersFromForm();
    if (hasActiveFilters(activeFilters)) {
      payload.filters = activeFilters;
    }
    if (compareEnabled && selectedCompareIds.size > 0) {
      payload.compare_event_ids = Array.from(selectedCompareIds).slice(0, SMART_SEARCH_MAX_COMPARE_ITEMS);
    }

    const homeBorough = homeBoroughSelect?.value as SmartSearchCommuteProfile['home_borough'] | '';
    const workBorough = workBoroughSelect?.value as SmartSearchCommuteProfile['work_borough'] | '';
    const profileAnchor = (commuteAnchorSelect?.value || 'balanced') as SmartSearchCommuteProfile['profile_anchor'];
    if (homeBorough || workBorough) {
      payload.commute_profile = {
        ...(homeBorough ? { home_borough: homeBorough } : {}),
        ...(workBorough ? { work_borough: workBorough } : {}),
        profile_anchor: profileAnchor,
      };
    }

    const preferredVibe = neighborhoodVibeSelect?.value as SmartSearchNeighborhoodVibe | '';
    const crowdTolerance = neighborhoodCrowdSelect?.value as SmartSearchNeighborhoodProfile['crowd_tolerance'] | '';
    const budgetPreference = neighborhoodBudgetSelect?.value as SmartSearchNeighborhoodProfile['budget_preference'] | '';
    if (preferredVibe || crowdTolerance || budgetPreference || homeBorough) {
      payload.neighborhood_profile = {
        ...(preferredVibe ? { preferred_vibes: [preferredVibe] } : {}),
        ...(homeBorough ? { preferred_boroughs: [homeBorough] } : {}),
        ...(crowdTolerance ? { crowd_tolerance: crowdTolerance } : {}),
        ...(budgetPreference ? { budget_preference: budgetPreference } : {}),
      };
    }

    lastSearchRequest = {
      query,
      filters: activeFilters,
      commute_profile: {
        ...(homeBorough ? { home_borough: homeBorough } : {}),
        ...(workBorough ? { work_borough: workBorough } : {}),
        ...(profileAnchor ? { profile_anchor: profileAnchor } : {}),
      },
      neighborhood_profile: {
        ...(preferredVibe ? { preferred_vibe: preferredVibe } : {}),
        ...(crowdTolerance ? { crowd_tolerance: crowdTolerance } : {}),
        ...(budgetPreference ? { budget_preference: budgetPreference } : {}),
      },
      created_at: new Date().toISOString(),
    };
    writeLastSmartSearchRequest(lastSearchRequest);
    recentQueries = rememberRecentSmartSearchQuery(query);
    renderRecentQueryButtons();
    updateRunLastButtonState();
    syncSearchStateToUrl(query, activeFilters);

    status.textContent = 'Searching local events...';
    if (submit) submit.disabled = true;

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 503) {
        status.textContent = 'Smart Search is not enabled for this environment.';
        lastExperimentAssignments = [];
        clearSmartSearchResults(results);
        return;
      }

      if (!response.ok) {
        status.textContent = 'Search failed. Please try again.';
        lastExperimentAssignments = [];
        clearSmartSearchResults(results);
        return;
      }

      const body = await response.json() as SmartSearchResponse;
      void trackEvent({
        event_name: 'search_query',
        properties: {
          query_text: query,
          result_count: body.total,
          ...(activeFilters.borough ? { borough: activeFilters.borough } : {}),
          ...(activeFilters.category ? { category: activeFilters.category } : {}),
        },
      });

      if (!body.results || body.results.length === 0) {
        status.textContent = 'No events found for that query yet. Try another vibe.';
        latestResults = [];
        lastQueryText = query;
        lastActiveFilters = activeFilters;
        lastExperimentAssignments = [];
        clearSmartSearchResults(results);
        if (comparePanel) comparePanel.hidden = true;
        return;
      }

      const responseExperimentAssignments = (body.experiments ?? [])
        .map((assignment) => `${assignment.id}:${assignment.variant}`);
      status.textContent = `Found ${body.total} matching events.`;
      latestResults = body.results;
      lastSearchCompletedAtMs = Date.now();
      markJourneyProgressStep('search_completed_at');
      lastQueryText = query;
      lastActiveFilters = activeFilters;
      lastExperimentAssignments = responseExperimentAssignments;
      renderLatestResults();
      if (fraudRiskEnabled) {
        void loadFraudOpsDashboard();
      }
    } catch {
      status.textContent = 'Network error while searching. Please try again.';
      latestResults = [];
      lastSearchCompletedAtMs = null;
      lastExperimentAssignments = [];
      clearSmartSearchResults(results);
      if (comparePanel) comparePanel.hidden = true;
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  if (restoredFromUrl) {
    status.textContent = 'Loaded search from URL. Running Smart Search...';
    form.requestSubmit();
  }
}

export function initMobileNav(): void {
  initMobileNavController({
    isNavOpen: () => pageState.navOpen,
    setNavOpen: (open) => {
      pageState.navOpen = open;
    },
  });
}

export function initCarousel(): void {
  initCarouselController({
    state: pageState,
  });
}

// ---------------------------------------------------------------------------
// DOMContentLoaded bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initAnalytics();
  attachCTAListeners();
  initOnboardingAssistant();
  initJourneyProgress();
  initLeadCaptureForm();
  initSectionObserver();
  initFAQ();
  initPricingTabs();
  void bootstrapRuntimeConfig().finally(() => {
    initSmartSearch();
    initMarketingSnapshot();
  });
  initMobileNav();
  initCarousel();
});
