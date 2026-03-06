import { gte } from 'drizzle-orm';
import { createDb } from '../db/client';
import { analytics_events } from '../db/schema';
import {
  resolveIntakeFollowUpDecision,
  type IntakeTeamSize,
  type IntakeUseCase,
} from '../intake/routing';

type FunnelCounts = {
  searches: number;
  clicks: number;
  inquiries: number;
  schedules: number;
};

type WaitlistFlowCounts = {
  preview_updates: number;
  submit_attempts: number;
  submit_successes: number;
};

type PlaybookOutcomeDelta = {
  completion_started_at: string | null;
  has_comparison: boolean;
  baseline_searches: number;
  followup_searches: number;
  click_through_rate_delta: number;
  inquiry_rate_delta: number;
  schedule_rate_delta: number;
  confidence: 'high' | 'medium' | 'low';
};

type PlaybookRecoveryRecommendation = {
  id: 'ctr_recovery' | 'inquiry_recovery' | 'schedule_recovery' | 'momentum_scale';
  title: string;
  detail: string;
  suggested_query: string;
  priority: 'high' | 'medium' | 'low';
};

type RecoveryOutcomeDelta = {
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

type RecoveryEscalationAction = {
  id:
    | 'escalate_metadata_audit'
    | 'escalate_cta_trust'
    | 'escalate_followup_automation'
    | 'codify_recovery_playbook';
  title: string;
  detail: string;
  suggested_query: string;
  priority: 'high' | 'medium' | 'low';
};

type RecoveryEscalationAttributionAction = {
  action_id:
    | 'escalate_metadata_audit'
    | 'escalate_cta_trust'
    | 'escalate_followup_automation'
    | 'codify_recovery_playbook';
  total_runs: number;
  manual_runs: number;
  auto_runs: number;
  sessions_with_run: number;
  last_run_at: string | null;
  success_score: number;
  recommended_mode: 'manual' | 'auto';
};

type RecoveryEscalationAttribution = {
  total_runs: number;
  manual_runs: number;
  auto_runs: number;
  actions: RecoveryEscalationAttributionAction[];
};

type MarketingSnapshotTuningRule = {
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
};

type QueryClusterKey =
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

type MutableQueryClusterStats = {
  key: QueryClusterKey;
  label: string;
  searches: number;
  clicks: number;
  inquiries: number;
  schedules: number;
  sample_queries: Set<string>;
};

type QueryClusterSummary = {
  cluster_key: QueryClusterKey;
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
};

type QueryClusterRecommendation = {
  cluster_key: QueryClusterKey;
  title: string;
  detail: string;
  suggested_query: string;
  focus_stage: 'ctr' | 'inquiry' | 'schedule' | 'scale';
  priority: 'high' | 'medium' | 'low';
};

type FunnelFrictionAlert = {
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
  auto_fix:
    | 'auto_run_top_opportunity'
    | 'auto_create_saved_alert'
    | 'autofill_intake_profile'
    | 'instant_role_setup'
    | 'auto_schedule_after_inquiry';
};

type AutomationRecommendation = {
  id:
    | 'auto_run_top_opportunity'
    | 'auto_create_saved_alert'
    | 'autofill_intake_profile'
    | 'instant_role_setup'
    | 'auto_schedule_after_inquiry';
  label: string;
  description: string;
  enabled_by_default: boolean;
  impact: 'acquisition' | 'conversion' | 'retention' | 'operations';
};

type WeeklyExecutionPlaybook = {
  title: string;
  primary_goal: string;
  recommended_use_case: IntakeUseCase;
  recommended_team_size: IntakeTeamSize;
  recommended_route: 'community_waitlist' | 'self_serve_onboarding' | 'marketing_consult' | 'sales_demo' | 'partnership_review';
  focus_query: string;
  confidence: 'high' | 'medium' | 'low';
  confidence_reason: string;
  route_rationale: string;
  assumptions: string[];
  requires_manual_review: boolean;
  steps: string[];
};

const QUERY_CLUSTER_RULES: Array<{
  key: QueryClusterKey;
  label: string;
  patterns: RegExp[];
}> = [
  {
    key: 'bookable_events',
    label: 'Bookable Event Intent',
    patterns: [/\bbook\b/, /\bbooking\b/, /\brsvp\b/, /\bticket\b/, /\breserve\b/],
  },
  {
    key: 'business_marketing',
    label: 'Marketing And Ranking',
    patterns: [/\bseo\b/, /\branking\b/, /\bconversion\b/, /\bctr\b/, /\banalytics\b/, /\bmarketing\b/],
  },
  {
    key: 'partnership_programs',
    label: 'Partnership Programs',
    patterns: [/\bpartner\b/, /\bpartnership\b/, /\bagency\b/, /\bprogram\b/],
  },
  {
    key: 'networking_growth',
    label: 'Networking And Growth',
    patterns: [/\bnetworking\b/, /\bmeetup\b/, /\bfounder\b/, /\bstartup\b/, /\bgrowth\b/],
  },
  {
    key: 'family_planning',
    label: 'Family Activities',
    patterns: [/\bfamily\b/, /\bkids?\b/, /\bchildren\b/, /\bparents?\b/],
  },
  {
    key: 'music_nightlife',
    label: 'Music And Nightlife',
    patterns: [/\bmusic\b/, /\bjazz\b/, /\bconcert\b/, /\blive\b/, /\bnightlife\b/, /\bdj\b/],
  },
  {
    key: 'food_experiences',
    label: 'Food And Dining',
    patterns: [/\bfood\b/, /\bdining\b/, /\bbrunch\b/, /\brestaurant\b/, /\bmarket\b/, /\bramen\b/],
  },
  {
    key: 'budget_friendly',
    label: 'Budget-Friendly Events',
    patterns: [/\bfree\b/, /\bcheap\b/, /\bbudget\b/, /\bund(er|a)\b/, /\blow[- ]?cost\b/],
  },
  {
    key: 'local_discovery',
    label: 'Hyper-Local Discovery',
    patterns: [/\bnear me\b/, /\bnearby\b/, /\blocal\b/, /\bthis weekend\b/, /\btonight\b/, /\bthings to do\b/],
  },
];

const HIGH_INTENT_CLUSTERS = new Set<QueryClusterKey>([
  'bookable_events',
  'business_marketing',
  'partnership_programs',
  'networking_growth',
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function eventDay(iso: string): string {
  return iso.slice(0, 10);
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeQueryText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 180);
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function buildPlaybookRecoveryRecommendations(input: {
  outcome: PlaybookOutcomeDelta;
  focus_query: string;
}): PlaybookRecoveryRecommendation[] {
  if (!input.outcome.has_comparison) return [];
  const output: PlaybookRecoveryRecommendation[] = [];
  const focusQuery = input.focus_query || 'local event discovery ranking opportunities';

  if (input.outcome.click_through_rate_delta <= -0.02) {
    output.push({
      id: 'ctr_recovery',
      title: 'Recover click-through performance',
      detail: 'CTR dropped after execution start. Refresh title/snippet intent and test a clearer promise.',
      suggested_query: focusQuery,
      priority: 'high',
    });
  }
  if (input.outcome.inquiry_rate_delta <= -0.03) {
    output.push({
      id: 'inquiry_recovery',
      title: 'Recover inquiry conversion',
      detail: 'Inquiry conversion dropped. Tighten CTA clarity and trust proof on top-intent pages.',
      suggested_query: `${focusQuery} booking intent`,
      priority: 'high',
    });
  }
  if (input.outcome.schedule_rate_delta <= -0.04) {
    output.push({
      id: 'schedule_recovery',
      title: 'Recover schedule completion',
      detail: 'Schedule completion dropped. Reduce follow-up friction and emphasize next-step scheduling defaults.',
      suggested_query: `${focusQuery} flexible scheduling`,
      priority: 'medium',
    });
  }
  if (output.length === 0 && (
    input.outcome.click_through_rate_delta >= 0.02
    || input.outcome.inquiry_rate_delta >= 0.02
    || input.outcome.schedule_rate_delta >= 0.02
  )) {
    output.push({
      id: 'momentum_scale',
      title: 'Scale positive momentum',
      detail: 'Outcome deltas are positive. Expand winning content patterns to adjacent high-intent clusters.',
      suggested_query: `${focusQuery} high intent`,
      priority: 'low',
    });
  }
  return output.slice(0, 3);
}

function buildRecoveryEscalationActions(input: {
  recovery: RecoveryOutcomeDelta;
  focus_query: string;
  route: WeeklyExecutionPlaybook['recommended_route'];
}): RecoveryEscalationAction[] {
  if (!input.recovery.has_comparison) return [];
  const actions: RecoveryEscalationAction[] = [];
  const focusQuery = input.focus_query || 'local event discovery ranking opportunities';
  const routeLabel = input.route.replaceAll('_', ' ');

  if (input.recovery.click_through_rate_delta <= 0) {
    actions.push({
      id: 'escalate_metadata_audit',
      title: 'Escalate metadata audit',
      detail: `Recovery runs have not improved CTR. Audit title/snippet intent and escalate review through the ${routeLabel} route.`,
      suggested_query: `${focusQuery} title snippet audit`,
      priority: 'high',
    });
  }
  if (input.recovery.inquiry_rate_delta <= 0) {
    actions.push({
      id: 'escalate_cta_trust',
      title: 'Escalate CTA and trust proof review',
      detail: 'Inquiry rate is still flat or down. Tighten CTA hierarchy and strengthen proof near high-intent conversion points.',
      suggested_query: `${focusQuery} CTA trust proof`,
      priority: 'high',
    });
  }
  if (input.recovery.schedule_rate_delta <= 0) {
    actions.push({
      id: 'escalate_followup_automation',
      title: 'Escalate follow-up automation defaults',
      detail: 'Schedule completion has not recovered. Validate follow-up timing and default scheduling automation coverage.',
      suggested_query: `${focusQuery} follow-up scheduling automation`,
      priority: 'medium',
    });
  }
  if (actions.length === 0 && (
    input.recovery.click_through_rate_delta >= 0.02
    || input.recovery.inquiry_rate_delta >= 0.02
    || input.recovery.schedule_rate_delta >= 0.02
  )) {
    actions.push({
      id: 'codify_recovery_playbook',
      title: 'Codify recovery playbook pattern',
      detail: 'Recovery outcomes are trending positive. Document and scale this pattern across adjacent high-intent clusters.',
      suggested_query: `${focusQuery} scale winning recovery pattern`,
      priority: 'low',
    });
  }

  return actions.slice(0, 3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scoreEscalationAction(
  actionId: RecoveryEscalationAttributionAction['action_id'],
  recovery: RecoveryOutcomeDelta,
): number {
  const targetDelta = actionId === 'escalate_metadata_audit'
    ? recovery.click_through_rate_delta
    : actionId === 'escalate_cta_trust'
      ? recovery.inquiry_rate_delta
      : actionId === 'escalate_followup_automation'
        ? recovery.schedule_rate_delta
        : (
          recovery.click_through_rate_delta
          + recovery.inquiry_rate_delta
          + recovery.schedule_rate_delta
        ) / 3;
  const scaled = 50 + (targetDelta * 1200);
  return Math.round(clamp(scaled, 0, 100));
}

function buildAutomationTuningRules(input: {
  trend_direction: 'up' | 'down' | 'flat';
  funnel_health_score: number;
  funnel_click_through_rate: number;
  playbook_confidence: 'high' | 'medium' | 'low';
  recovery: RecoveryOutcomeDelta;
  escalation_attribution: RecoveryEscalationAttribution;
}): MarketingSnapshotTuningRule[] {
  const hasRecoveryRegression = (
    input.recovery.click_through_rate_delta <= 0
    || input.recovery.inquiry_rate_delta <= 0
    || input.recovery.schedule_rate_delta <= 0
  );
  const escalationAutoSetting = (
    input.recovery.has_comparison
    && input.recovery.confidence === 'high'
    && input.recovery.total_runs >= 2
    && hasRecoveryRegression
  );
  const escalationCooldownHours: 6 | 12 | 24 | 48 = escalationAutoSetting
    ? (
      input.escalation_attribution.auto_runs >= 3
        ? 48
        : input.escalation_attribution.auto_runs >= 1
          ? 24
          : 12
    )
    : 48;

  return [
    {
      id: 'tune_auto_run_top_opportunity',
      setting: input.trend_direction === 'down' || input.funnel_click_through_rate < 0.16,
      confidence: input.funnel_health_score >= 75 ? 'high' : 'medium',
      reason: 'Keep top-opportunity auto-run enabled when discovery demand is cooling or CTR remains under target.',
      priority: 'medium',
    },
    {
      id: 'tune_auto_run_recovery',
      setting: input.recovery.has_comparison && (
        input.recovery.click_through_rate_delta <= -0.01
        || input.recovery.inquiry_rate_delta <= -0.01
        || input.recovery.schedule_rate_delta <= -0.01
      ),
      confidence: input.recovery.confidence,
      reason: 'Enable recovery auto-run only when comparison windows confirm negative movement that needs intervention.',
      priority: 'high',
    },
    {
      id: 'tune_auto_run_escalation',
      setting: escalationAutoSetting,
      confidence: input.recovery.confidence,
      reason: 'Escalation auto-run requires high-confidence comparison data, repeated recovery attempts, and unresolved outcomes.',
      priority: escalationAutoSetting ? 'high' : 'medium',
      cooldown_hours: escalationCooldownHours,
    },
    {
      id: 'tune_auto_apply_recommended',
      setting: input.playbook_confidence !== 'low' && input.funnel_health_score < 90,
      confidence: input.playbook_confidence,
      reason: 'Auto-apply defaults when confidence is not low and funnel health still benefits from automated assistance.',
      priority: 'medium',
    },
  ];
}

function resolveQueryCluster(queryText: string): { key: QueryClusterKey; label: string } {
  for (const rule of QUERY_CLUSTER_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(queryText))) {
      return { key: rule.key, label: rule.label };
    }
  }
  return {
    key: 'general_exploration',
    label: 'General Exploration',
  };
}

function clusterLabelForKey(key: QueryClusterKey): string {
  const match = QUERY_CLUSTER_RULES.find((item) => item.key === key);
  if (match) return match.label;
  return key === 'general_exploration' ? 'General Exploration' : key.replaceAll('_', ' ');
}

function upsertClusterStats(
  store: Map<QueryClusterKey, MutableQueryClusterStats>,
  cluster: { key: QueryClusterKey; label: string },
): MutableQueryClusterStats {
  const existing = store.get(cluster.key);
  if (existing) return existing;
  const created: MutableQueryClusterStats = {
    key: cluster.key,
    label: cluster.label,
    searches: 0,
    clicks: 0,
    inquiries: 0,
    schedules: 0,
    sample_queries: new Set<string>(),
  };
  store.set(cluster.key, created);
  return created;
}

function computeOpportunityScore(summary: {
  key: QueryClusterKey;
  searches: number;
  click_through_rate: number;
  inquiry_rate: number;
  schedule_rate: number;
}): number {
  const targetCtr = 0.18;
  const targetInquiryRate = 0.28;
  const targetScheduleRate = 0.4;
  const targetCoverage = (targetCtr * 0.45) + (targetInquiryRate * 0.35) + (targetScheduleRate * 0.2);
  const observedCoverage = (summary.click_through_rate * 0.45) + (summary.inquiry_rate * 0.35) + (summary.schedule_rate * 0.2);
  const coverageGap = targetCoverage > 0 ? Math.max(targetCoverage - observedCoverage, 0) / targetCoverage : 0;
  const volumeFactor = Math.min(1 + (Math.log2(summary.searches + 1) / 4), 2);
  const intentBoost = HIGH_INTENT_CLUSTERS.has(summary.key) ? 1.2 : 1;
  return Number((coverageGap * 100 * volumeFactor * intentBoost).toFixed(1));
}

function recommendationPriority(score: number): 'high' | 'medium' | 'low' {
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function buildClusterRecommendation(cluster: QueryClusterSummary): QueryClusterRecommendation {
  const focusStage: QueryClusterRecommendation['focus_stage'] = cluster.click_through_rate < 0.18
    ? 'ctr'
    : cluster.inquiry_rate < 0.28
      ? 'inquiry'
      : cluster.schedule_rate < 0.4
        ? 'schedule'
        : 'scale';

  if (focusStage === 'ctr') {
    return {
      cluster_key: cluster.cluster_key,
      title: `Increase click-through for ${cluster.label}`,
      detail: 'This cluster has search demand, but listing snippets are not converting enough clicks.',
      suggested_query: cluster.sample_query,
      focus_stage: 'ctr',
      priority: recommendationPriority(cluster.opportunity_score),
    };
  }
  if (focusStage === 'inquiry') {
    return {
      cluster_key: cluster.cluster_key,
      title: `Improve inquiry conversion for ${cluster.label}`,
      detail: 'Users click results, but intake intent is weak. Tighten CTA framing and trust proof near the form.',
      suggested_query: cluster.sample_query,
      focus_stage: 'inquiry',
      priority: recommendationPriority(cluster.opportunity_score),
    };
  }
  if (focusStage === 'schedule') {
    return {
      cluster_key: cluster.cluster_key,
      title: `Raise schedule confirmations for ${cluster.label}`,
      detail: 'Inquiries are happening, but scheduling is lagging. Prioritize faster follow-up defaults and timing options.',
      suggested_query: cluster.sample_query,
      focus_stage: 'schedule',
      priority: recommendationPriority(cluster.opportunity_score),
    };
  }
  return {
    cluster_key: cluster.cluster_key,
    title: `Scale winning coverage for ${cluster.label}`,
    detail: 'This cluster is performing well. Expand related content and keep freshness updates consistent.',
    suggested_query: cluster.sample_query,
    focus_stage: 'scale',
    priority: recommendationPriority(cluster.opportunity_score),
  };
}

function sortAlertsBySeverity(alerts: FunnelFrictionAlert[]): FunnelFrictionAlert[] {
  const severityRank: Record<FunnelFrictionAlert['severity'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return [...alerts].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

function buildFunnelFrictionAlerts(input: {
  funnel: {
    searches: number;
    clicks: number;
    inquiries: number;
    click_through_rate: number;
    inquiry_rate: number;
    schedule_rate: number;
  };
  waitlist_funnel: {
    preview_updates: number;
    submit_attempts: number;
    submit_success_rate: number;
    preview_to_submit_rate: number;
    by_surface: {
      landing: {
        submit_attempts: number;
        submit_successes: number;
      };
      contact: {
        submit_attempts: number;
        submit_successes: number;
      };
    };
  };
  top_query: string;
}): FunnelFrictionAlert[] {
  const alerts: FunnelFrictionAlert[] = [];
  const query = input.top_query || 'local events near me this week';

  if (input.funnel.searches >= 12 && input.funnel.click_through_rate < 0.12) {
    alerts.push({
      id: 'ctr_gap',
      stage: 'discover',
      severity: input.funnel.click_through_rate < 0.08 ? 'high' : 'medium',
      headline: 'Low click-through from search intent',
      detail: 'Discovery demand exists, but snippets and headlines are not attracting enough clicks.',
      suggested_query: query,
      auto_fix: 'auto_run_top_opportunity',
    });
  }

  if (input.funnel.clicks >= 8 && input.funnel.inquiry_rate < 0.22) {
    alerts.push({
      id: 'inquiry_gap',
      stage: 'convert',
      severity: input.funnel.inquiry_rate < 0.14 ? 'high' : 'medium',
      headline: 'Clicks are not converting into intake intent',
      detail: 'Visitors engage with results but do not progress into inquiry. Tighten CTA framing and form context.',
      suggested_query: query,
      auto_fix: 'autofill_intake_profile',
    });
  }

  if (input.funnel.inquiries >= 5 && input.funnel.schedule_rate < 0.32) {
    alerts.push({
      id: 'schedule_gap',
      stage: 'schedule',
      severity: input.funnel.schedule_rate < 0.2 ? 'high' : 'medium',
      headline: 'Inquiry-to-schedule handoff is weak',
      detail: 'Users start inquiry but drop before scheduling. Enable default scheduling behavior to close the loop.',
      suggested_query: 'events with flexible booking times',
      auto_fix: 'auto_schedule_after_inquiry',
    });
  }

  if (input.waitlist_funnel.preview_updates >= 6 && input.waitlist_funnel.preview_to_submit_rate < 0.45) {
    alerts.push({
      id: 'waitlist_preview_gap',
      stage: 'waitlist',
      severity: input.waitlist_funnel.preview_to_submit_rate < 0.25 ? 'high' : 'medium',
      headline: 'Many users preview routes but do not submit',
      detail: 'Pre-submit confidence is low. Keep instant setup and autofill enabled to reduce manual input burden.',
      suggested_query: 'marketing analytics consult for local events',
      auto_fix: 'instant_role_setup',
    });
  }

  const landingAttempts = input.waitlist_funnel.by_surface.landing.submit_attempts;
  const contactAttempts = input.waitlist_funnel.by_surface.contact.submit_attempts;
  const landingRate = landingAttempts > 0
    ? input.waitlist_funnel.by_surface.landing.submit_successes / landingAttempts
    : 0;
  const contactRate = contactAttempts > 0
    ? input.waitlist_funnel.by_surface.contact.submit_successes / contactAttempts
    : 0;

  if (landingAttempts >= 5 && contactAttempts >= 5 && contactRate - landingRate > 0.15) {
    alerts.push({
      id: 'landing_conversion_gap',
      stage: 'waitlist',
      severity: 'medium',
      headline: 'Landing intake completion lags behind contact flow',
      detail: 'Contact submissions are converting better. Reuse the contact-quality framing on landing intake prompts.',
      suggested_query: query,
      auto_fix: 'autofill_intake_profile',
    });
  }

  if (landingAttempts >= 5 && contactAttempts >= 5 && landingRate - contactRate > 0.15) {
    alerts.push({
      id: 'contact_conversion_gap',
      stage: 'waitlist',
      severity: 'low',
      headline: 'Contact intake completion lags behind landing flow',
      detail: 'Contact form may require extra context. Strengthen route plan cues and prefilled goals.',
      suggested_query: 'local event discovery consult intake',
      auto_fix: 'autofill_intake_profile',
    });
  }

  return sortAlertsBySeverity(alerts).slice(0, 5);
}

function buildAutomationRecommendations(input: {
  trend_direction: 'up' | 'down' | 'flat';
  funnel: {
    inquiries: number;
    click_through_rate: number;
    schedule_rate: number;
  };
  waitlist_funnel: {
    preview_updates: number;
    submit_attempts: number;
    preview_to_submit_rate: number;
  };
}): AutomationRecommendation[] {
  const output: AutomationRecommendation[] = [];

  output.push({
    id: 'auto_run_top_opportunity',
    label: 'Auto-run top opportunity query',
    description: 'Immediately run the highest-opportunity cluster query after metrics refresh.',
    enabled_by_default: input.trend_direction === 'down' || input.funnel.click_through_rate < 0.16,
    impact: 'acquisition',
  });

  output.push({
    id: 'instant_role_setup',
    label: 'Instant role setup',
    description: 'Apply role defaults as soon as users choose a workflow persona.',
    enabled_by_default: input.waitlist_funnel.preview_updates > 0 && input.waitlist_funnel.submit_attempts === 0,
    impact: 'conversion',
  });

  output.push({
    id: 'autofill_intake_profile',
    label: 'Autofill intake profile',
    description: 'Prefill lead and contact forms from onboarding profile context.',
    enabled_by_default: input.waitlist_funnel.preview_to_submit_rate < 0.6,
    impact: 'conversion',
  });

  output.push({
    id: 'auto_create_saved_alert',
    label: 'Auto-create saved alert',
    description: 'Create a default saved search alert from onboarding defaults.',
    enabled_by_default: input.funnel.inquiries === 0,
    impact: 'retention',
  });

  output.push({
    id: 'auto_schedule_after_inquiry',
    label: 'Auto-schedule after inquiry',
    description: 'Use calendar defaults to automatically schedule when inquiry is submitted.',
    enabled_by_default: input.funnel.inquiries >= 3 && input.funnel.schedule_rate < 0.35,
    impact: 'operations',
  });

  return output;
}

function resolvePlaybookUseCase(input: {
  top_cluster?: QueryClusterSummary;
  top_recommendation?: QueryClusterRecommendation;
}): IntakeUseCase {
  const topCluster = input.top_cluster;
  if (!topCluster) return 'marketing_analytics';
  if (topCluster.cluster_key === 'partnership_programs') return 'agency_partnership';
  if (topCluster.cluster_key === 'business_marketing' || topCluster.cluster_key === 'networking_growth') {
    return 'marketing_analytics';
  }
  if (topCluster.cluster_key === 'bookable_events' && input.top_recommendation?.focus_stage === 'schedule') {
    return 'business_listing';
  }
  return 'marketing_analytics';
}

function resolvePlaybookTeamSize(input: {
  use_case: IntakeUseCase;
  top_cluster?: QueryClusterSummary;
}): IntakeTeamSize {
  if (input.use_case === 'agency_partnership') {
    if ((input.top_cluster?.searches ?? 0) >= 40) return 'enterprise_50_plus';
    return 'mid_11_50';
  }
  if ((input.top_cluster?.high_intent ?? false) && (input.top_cluster?.searches ?? 0) >= 20) {
    return 'mid_11_50';
  }
  return 'small_2_10';
}

function buildPlaybookGoal(recommendation?: QueryClusterRecommendation): string {
  if (!recommendation) {
    return 'Establish baseline ranking and inquiry conversion for priority local queries this week.';
  }
  if (recommendation.focus_stage === 'ctr') {
    return 'Improve click-through performance for high-intent local queries with stronger snippet and CTA alignment.';
  }
  if (recommendation.focus_stage === 'inquiry') {
    return 'Increase inquiry conversion from engaged search traffic with clearer intent mapping and trust cues.';
  }
  if (recommendation.focus_stage === 'schedule') {
    return 'Improve inquiry-to-schedule completion by reducing follow-up friction and enabling default scheduling actions.';
  }
  return 'Scale winning query-cluster coverage while protecting conversion quality across top-performing intents.';
}

function buildPlaybookConfidenceReason(input: {
  searches: number;
  inquiries: number;
  schedules: number;
}): string {
  if (input.searches >= 25) {
    return 'High confidence because the weekly sample has at least 25 searches, giving stable routing signals.';
  }
  if (input.searches >= 8 || input.inquiries >= 2) {
    return 'Medium confidence because there is directional traffic and early conversion activity, but sample size is still limited.';
  }
  if (input.schedules >= 1) {
    return 'Medium confidence because conversion has reached scheduling even with a small top-of-funnel sample.';
  }
  return 'Low confidence because traffic volume is light; confirm use case, team size, and goal before submitting intake.';
}

function buildPlaybookRouteRationale(input: {
  route: 'community_waitlist' | 'self_serve_onboarding' | 'marketing_consult' | 'sales_demo' | 'partnership_review';
  use_case: IntakeUseCase;
  team_size: IntakeTeamSize;
  recommendation?: QueryClusterRecommendation;
}): string {
  if (input.route === 'marketing_consult') {
    return 'Marketing consult is recommended because this context points to ranking and conversion optimization work that benefits from guided strategy support.';
  }
  if (input.route === 'sales_demo') {
    return 'Sales demo is recommended because team scope suggests operational onboarding and workflow alignment across multiple stakeholders.';
  }
  if (input.route === 'partnership_review') {
    return 'Partnership review is recommended because route signals indicate agency or enterprise coordination requirements.';
  }
  if (input.route === 'self_serve_onboarding') {
    return 'Self-serve onboarding is recommended because current inputs suggest a manageable setup that can start immediately with defaults.';
  }
  const stage = input.recommendation?.focus_stage;
  if (stage === 'ctr' || stage === 'inquiry') {
    return 'Community waitlist is recommended first to collect tighter intent context before committing to a heavier consult workflow.';
  }
  return 'Community waitlist is recommended because this context is still exploratory and benefits from baseline routing first.';
}

function buildPlaybookAssumptions(input: {
  use_case: IntakeUseCase;
  team_size: IntakeTeamSize;
  focus_query: string;
  confidence: 'high' | 'medium' | 'low';
}): string[] {
  const assumptions = [
    `Assumed use case: ${input.use_case.replaceAll('_', ' ')}.`,
    `Assumed team size: ${input.team_size.replaceAll('_', ' ')}.`,
    `Assumed focus query "${input.focus_query}" still represents this week’s highest-opportunity intent.`,
  ];
  if (input.confidence === 'low') {
    assumptions.push('Manual review required: verify routing assumptions in intake before final submission.');
  }
  return assumptions;
}

function buildPlaybookSteps(input: {
  recommendation?: QueryClusterRecommendation;
  focus_query: string;
  route: 'community_waitlist' | 'self_serve_onboarding' | 'marketing_consult' | 'sales_demo' | 'partnership_review';
}): string[] {
  const stage = input.recommendation?.focus_stage ?? 'scale';
  const steps = [
    `Run focus query: "${input.focus_query}" and validate current funnel metrics.`,
  ];
  if (stage === 'ctr') {
    steps.push('Update headline/snippet intent framing and compare click-through change after refresh.');
  } else if (stage === 'inquiry') {
    steps.push('Tighten intake CTA language and route-plan guidance for the highest-opportunity cluster.');
  } else if (stage === 'schedule') {
    steps.push('Enable scheduling defaults and monitor inquiry-to-schedule completion in the same window.');
  } else {
    steps.push('Expand top-performing cluster coverage with one practical content and CTA iteration.');
  }
  steps.push(`Launch prefilled intake for ${input.route.replaceAll('_', ' ')} execution support.`);
  return steps;
}

function buildExecutionPlaybook(input: {
  top_cluster?: QueryClusterSummary;
  top_recommendation?: QueryClusterRecommendation;
  funnel: {
    searches: number;
    inquiries: number;
    schedules: number;
  };
}): WeeklyExecutionPlaybook {
  const useCase = resolvePlaybookUseCase({
    top_cluster: input.top_cluster,
    top_recommendation: input.top_recommendation,
  });
  const teamSize = resolvePlaybookTeamSize({
    use_case: useCase,
    top_cluster: input.top_cluster,
  });
  const primaryGoal = buildPlaybookGoal(input.top_recommendation);
  const routeDecision = resolveIntakeFollowUpDecision({
    use_case: useCase,
    team_size: teamSize,
    goal: primaryGoal,
  });
  const focusQuery = input.top_recommendation?.suggested_query
    ?? input.top_cluster?.sample_query
    ?? 'local event discovery ranking opportunities';
  const confidence: WeeklyExecutionPlaybook['confidence'] = input.funnel.searches >= 25
    ? 'high'
    : input.funnel.searches >= 8 || input.funnel.inquiries >= 2
      ? 'medium'
      : 'low';
  const confidenceReason = buildPlaybookConfidenceReason({
    searches: input.funnel.searches,
    inquiries: input.funnel.inquiries,
    schedules: input.funnel.schedules,
  });
  const title = input.top_cluster
    ? `${input.top_cluster.label} execution playbook`
    : 'Weekly marketing execution playbook';
  const routeRationale = buildPlaybookRouteRationale({
    route: routeDecision.route,
    use_case: useCase,
    team_size: teamSize,
    recommendation: input.top_recommendation,
  });
  const assumptions = buildPlaybookAssumptions({
    use_case: useCase,
    team_size: teamSize,
    focus_query: focusQuery,
    confidence,
  });

  return {
    title,
    primary_goal: primaryGoal,
    recommended_use_case: useCase,
    recommended_team_size: teamSize,
    recommended_route: routeDecision.route,
    focus_query: focusQuery,
    confidence,
    confidence_reason: confidenceReason,
    route_rationale: routeRationale,
    assumptions,
    requires_manual_review: confidence === 'low',
    steps: buildPlaybookSteps({
      recommendation: input.top_recommendation,
      focus_query: focusQuery,
      route: routeDecision.route,
    }),
  };
}

function computeFunnelHealth(input: {
  click_through_rate: number;
  inquiry_rate: number;
  schedule_rate: number;
  preview_to_submit_rate: number;
  preview_updates: number;
}): {
  funnel_health_score: number;
  top_bottleneck_stage: 'discover' | 'convert' | 'schedule' | 'waitlist' | 'balanced';
} {
  const discoverScore = Math.min(1, input.click_through_rate / 0.18);
  const convertScore = Math.min(1, input.inquiry_rate / 0.28);
  const scheduleScore = Math.min(1, input.schedule_rate / 0.4);
  const waitlistScore = input.preview_updates > 0
    ? Math.min(1, input.preview_to_submit_rate / 0.6)
    : 1;
  const weighted =
    (discoverScore * 0.3)
    + (convertScore * 0.3)
    + (scheduleScore * 0.25)
    + (waitlistScore * 0.15);
  const stageScores: Array<{
    stage: 'discover' | 'convert' | 'schedule' | 'waitlist';
    score: number;
  }> = [
    { stage: 'discover', score: discoverScore },
    { stage: 'convert', score: convertScore },
    { stage: 'schedule', score: scheduleScore },
    { stage: 'waitlist', score: waitlistScore },
  ];
  stageScores.sort((a, b) => a.score - b.score);
  const topBottleneck = stageScores[0];
  return {
    funnel_health_score: Math.max(0, Math.min(100, Math.round(weighted * 100))),
    top_bottleneck_stage: (topBottleneck && topBottleneck.score < 0.95) ? topBottleneck.stage : 'balanced',
  };
}

function buildFallback(window_days: number) {
  return {
    summary: {
      window_days,
      total_events: 0,
      active_sessions: 0,
      trend_direction: 'flat' as const,
      funnel_health_score: 0,
      top_bottleneck_stage: 'balanced' as const,
    },
    top_events: [] as Array<{ event_name: string; count: number }>,
    funnel: {
      searches: 0,
      clicks: 0,
      inquiries: 0,
      schedules: 0,
      click_through_rate: 0,
      inquiry_rate: 0,
      schedule_rate: 0,
    },
    waitlist_funnel: {
      preview_updates: 0,
      submit_attempts: 0,
      submit_successes: 0,
      preview_to_submit_rate: 0,
      submit_success_rate: 0,
      by_surface: {
        landing: {
          preview_updates: 0,
          submit_attempts: 0,
          submit_successes: 0,
        },
        contact: {
          preview_updates: 0,
          submit_attempts: 0,
          submit_successes: 0,
        },
      },
    },
    query_clusters: [] as QueryClusterSummary[],
    recommendations: [] as QueryClusterRecommendation[],
    funnel_friction_alerts: [] as FunnelFrictionAlert[],
    automation_recommendations: [] as AutomationRecommendation[],
    automation_tuning_rules: [] as MarketingSnapshotTuningRule[],
    weekly_playbook: {
      title: 'Weekly marketing execution playbook',
      primary_goal: 'Establish baseline ranking and inquiry conversion for priority local queries this week.',
      recommended_use_case: 'marketing_analytics' as const,
      recommended_team_size: 'small_2_10' as const,
      recommended_route: 'marketing_consult' as const,
      focus_query: 'local event discovery ranking opportunities',
      confidence: 'low' as const,
      confidence_reason: 'Low confidence because traffic volume is light; confirm use case, team size, and goal before submitting intake.',
      route_rationale: 'Marketing consult is recommended because this context points to ranking and conversion optimization work that benefits from guided strategy support.',
      assumptions: [
        'Assumed use case: marketing analytics.',
        'Assumed team size: small 2 10.',
        'Assumed focus query "local event discovery ranking opportunities" still represents this week’s highest-opportunity intent.',
        'Manual review required: verify routing assumptions in intake before final submission.',
      ],
      requires_manual_review: true,
      steps: [
        'Run focus query and validate current funnel metrics.',
        'Document the main bottleneck and update one practical page element.',
        'Launch prefilled intake for guided execution support.',
      ],
    } satisfies WeeklyExecutionPlaybook,
    playbook_outcome_delta: {
      completion_started_at: null,
      has_comparison: false,
      baseline_searches: 0,
      followup_searches: 0,
      click_through_rate_delta: 0,
      inquiry_rate_delta: 0,
      schedule_rate_delta: 0,
      confidence: 'low' as const,
    } satisfies PlaybookOutcomeDelta,
    playbook_recovery_recommendations: [] as PlaybookRecoveryRecommendation[],
    recovery_outcome_delta: {
      recovery_started_at: null,
      total_runs: 0,
      sessions_with_run: 0,
      has_comparison: false,
      baseline_searches: 0,
      followup_searches: 0,
      click_through_rate_delta: 0,
      inquiry_rate_delta: 0,
      schedule_rate_delta: 0,
      confidence: 'low' as const,
    } satisfies RecoveryOutcomeDelta,
    recovery_escalation_actions: [] as RecoveryEscalationAction[],
    recovery_escalation_attribution: {
      total_runs: 0,
      manual_runs: 0,
      auto_runs: 0,
      actions: [] as RecoveryEscalationAttributionAction[],
    } satisfies RecoveryEscalationAttribution,
    playbook_execution: {
      completed_steps: 0,
      sessions_with_completion: 0,
      active_playbooks: 0,
      adoption_rate: 0,
    },
    daily: [] as Array<{ day: string; searches: number; clicks: number; inquiries: number; schedules: number }>,
  };
}

export async function buildInsightsHubSummary(input: {
  database_url?: string;
  window_days: number;
}): Promise<{
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
  query_clusters: QueryClusterSummary[];
  recommendations: QueryClusterRecommendation[];
  funnel_friction_alerts: FunnelFrictionAlert[];
  automation_recommendations: AutomationRecommendation[];
  automation_tuning_rules: MarketingSnapshotTuningRule[];
  weekly_playbook: WeeklyExecutionPlaybook;
  playbook_outcome_delta: PlaybookOutcomeDelta;
  playbook_recovery_recommendations: PlaybookRecoveryRecommendation[];
  recovery_outcome_delta: RecoveryOutcomeDelta;
  recovery_escalation_actions: RecoveryEscalationAction[];
  recovery_escalation_attribution: RecoveryEscalationAttribution;
  playbook_execution: {
    completed_steps: number;
    sessions_with_completion: number;
    active_playbooks: number;
    adoption_rate: number;
  };
  daily: Array<{ day: string; searches: number; clicks: number; inquiries: number; schedules: number }>;
}> {
  const window_days = Math.max(1, Math.min(90, Math.round(input.window_days)));
  const databaseUrl = input.database_url?.trim();
  if (!databaseUrl) return buildFallback(window_days);

  try {
    const fromDate = new Date(Date.now() - window_days * 24 * 60 * 60 * 1000);
    const db = createDb(databaseUrl);
    const rows = await db
      .select({
        event_name: analytics_events.event_name,
        session_id: analytics_events.session_id,
        properties: analytics_events.properties,
        created_at: analytics_events.created_at,
      })
      .from(analytics_events)
      .where(gte(analytics_events.created_at, fromDate))
      .limit(3000);
    const sortedRows = [...rows].sort((a, b) => {
      const aTime = a.created_at instanceof Date ? a.created_at.getTime() : new Date(String(a.created_at ?? 0)).getTime();
      const bTime = b.created_at instanceof Date ? b.created_at.getTime() : new Date(String(b.created_at ?? 0)).getTime();
      return aTime - bTime;
    });

    const eventCounts = new Map<string, number>();
    const sessionSet = new Set<string>();
    const sessionQueryCluster = new Map<string, QueryClusterKey>();
    const queryClusterStore = new Map<QueryClusterKey, MutableQueryClusterStats>();
    const daily = new Map<string, FunnelCounts>();
    const funnel: FunnelCounts = {
      searches: 0,
      clicks: 0,
      inquiries: 0,
      schedules: 0,
    };
    const waitlistFunnel: WaitlistFlowCounts = {
      preview_updates: 0,
      submit_attempts: 0,
      submit_successes: 0,
    };
    const waitlistBySurface: Record<'landing' | 'contact', WaitlistFlowCounts> = {
      landing: {
        preview_updates: 0,
        submit_attempts: 0,
        submit_successes: 0,
      },
      contact: {
        preview_updates: 0,
        submit_attempts: 0,
        submit_successes: 0,
      },
    };
    const playbookCompletionSessions = new Set<string>();
    const activePlaybookKeys = new Set<string>();
    const recoveryRunSessions = new Set<string>();
    const recoveryEscalationAttributionStore = new Map<
      RecoveryEscalationAttributionAction['action_id'],
      {
        total_runs: number;
        manual_runs: number;
        auto_runs: number;
        sessions: Set<string>;
        last_run_ms: number | null;
      }
    >();
    let recoveryRunCount = 0;
    let playbookCompletedSteps = 0;
    const firstPlaybookCompletionAt = sortedRows.find((row) => (
      row.event_name === 'marketing_snapshot_playbook_step_updated'
      && asRecord(row.properties).completed === true
    ));
    const firstPlaybookCompletionAtMs = firstPlaybookCompletionAt
      ? (
        firstPlaybookCompletionAt.created_at instanceof Date
          ? firstPlaybookCompletionAt.created_at.getTime()
          : new Date(String(firstPlaybookCompletionAt.created_at ?? '')).getTime()
      )
      : null;
    const baselineFunnel: FunnelCounts = { searches: 0, clicks: 0, inquiries: 0, schedules: 0 };
    const followupFunnel: FunnelCounts = { searches: 0, clicks: 0, inquiries: 0, schedules: 0 };
    const firstRecoveryRunAt = sortedRows.find((row) => row.event_name === 'marketing_snapshot_recovery_query_run');
    const firstRecoveryRunAtMs = firstRecoveryRunAt
      ? (
        firstRecoveryRunAt.created_at instanceof Date
          ? firstRecoveryRunAt.created_at.getTime()
          : new Date(String(firstRecoveryRunAt.created_at ?? '')).getTime()
      )
      : null;
    const recoveryBaselineFunnel: FunnelCounts = { searches: 0, clicks: 0, inquiries: 0, schedules: 0 };
    const recoveryFollowupFunnel: FunnelCounts = { searches: 0, clicks: 0, inquiries: 0, schedules: 0 };

    for (const row of sortedRows) {
      const eventName = row.event_name;
      const createdAtIso = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? '');
      const createdAtMs = row.created_at instanceof Date ? row.created_at.getTime() : new Date(String(row.created_at ?? '')).getTime();
      const day = eventDay(createdAtIso || new Date().toISOString());
      eventCounts.set(eventName, (eventCounts.get(eventName) ?? 0) + 1);

      const sessionId = typeof row.session_id === 'string' ? row.session_id.trim() : '';
      if (sessionId) sessionSet.add(sessionId);

      const bucket = daily.get(day) ?? { searches: 0, clicks: 0, inquiries: 0, schedules: 0 };
      const properties = asRecord(row.properties);

      if (eventName === 'search_query') {
        funnel.searches += 1;
        bucket.searches += 1;
        if (firstPlaybookCompletionAtMs !== null && Number.isFinite(createdAtMs)) {
          if (createdAtMs < firstPlaybookCompletionAtMs) baselineFunnel.searches += 1;
          else followupFunnel.searches += 1;
        }
        if (firstRecoveryRunAtMs !== null && Number.isFinite(createdAtMs)) {
          if (createdAtMs < firstRecoveryRunAtMs) recoveryBaselineFunnel.searches += 1;
          else recoveryFollowupFunnel.searches += 1;
        }
        const queryText = normalizeQueryText(properties.query_text);
        const cluster = resolveQueryCluster(queryText);
        const clusterStats = upsertClusterStats(queryClusterStore, cluster);
        clusterStats.searches += 1;
        if (queryText) clusterStats.sample_queries.add(queryText);
        if (sessionId) sessionQueryCluster.set(sessionId, cluster.key);
      }
      if (eventName === 'search_result_click') {
        funnel.clicks += 1;
        bucket.clicks += 1;
        if (firstPlaybookCompletionAtMs !== null && Number.isFinite(createdAtMs)) {
          if (createdAtMs < firstPlaybookCompletionAtMs) baselineFunnel.clicks += 1;
          else followupFunnel.clicks += 1;
        }
        if (firstRecoveryRunAtMs !== null && Number.isFinite(createdAtMs)) {
          if (createdAtMs < firstRecoveryRunAtMs) recoveryBaselineFunnel.clicks += 1;
          else recoveryFollowupFunnel.clicks += 1;
        }
        const fromSession = sessionId ? sessionQueryCluster.get(sessionId) : undefined;
        const fallbackCluster = resolveQueryCluster(normalizeQueryText(properties.query_text));
        const clusterKey = fromSession ?? fallbackCluster.key;
        const clusterStats = upsertClusterStats(queryClusterStore, {
          key: clusterKey,
          label: clusterLabelForKey(clusterKey),
        });
        clusterStats.clicks += 1;
        const queryText = normalizeQueryText(properties.query_text);
        if (queryText) clusterStats.sample_queries.add(queryText);
      }
      if (eventName === 'inquiry_submitted') {
        funnel.inquiries += 1;
        bucket.inquiries += 1;
        if (firstPlaybookCompletionAtMs !== null && Number.isFinite(createdAtMs)) {
          if (createdAtMs < firstPlaybookCompletionAtMs) baselineFunnel.inquiries += 1;
          else followupFunnel.inquiries += 1;
        }
        if (firstRecoveryRunAtMs !== null && Number.isFinite(createdAtMs)) {
          if (createdAtMs < firstRecoveryRunAtMs) recoveryBaselineFunnel.inquiries += 1;
          else recoveryFollowupFunnel.inquiries += 1;
        }
        const clusterKey = sessionId ? sessionQueryCluster.get(sessionId) : undefined;
        if (clusterKey) {
          const clusterStats = upsertClusterStats(queryClusterStore, {
            key: clusterKey,
            label: clusterLabelForKey(clusterKey),
          });
          clusterStats.inquiries += 1;
        }
      }
      if (eventName === 'schedule_confirmed') {
        funnel.schedules += 1;
        bucket.schedules += 1;
        if (firstPlaybookCompletionAtMs !== null && Number.isFinite(createdAtMs)) {
          if (createdAtMs < firstPlaybookCompletionAtMs) baselineFunnel.schedules += 1;
          else followupFunnel.schedules += 1;
        }
        if (firstRecoveryRunAtMs !== null && Number.isFinite(createdAtMs)) {
          if (createdAtMs < firstRecoveryRunAtMs) recoveryBaselineFunnel.schedules += 1;
          else recoveryFollowupFunnel.schedules += 1;
        }
        const clusterKey = sessionId ? sessionQueryCluster.get(sessionId) : undefined;
        if (clusterKey) {
          const clusterStats = upsertClusterStats(queryClusterStore, {
            key: clusterKey,
            label: clusterLabelForKey(clusterKey),
          });
          clusterStats.schedules += 1;
        }
      }
      if (
        eventName === 'waitlist_route_preview_updated'
        || eventName === 'waitlist_submit_attempted'
        || eventName === 'waitlist_submit_succeeded'
      ) {
        const surfaceRaw = properties.surface;
        const surface = surfaceRaw === 'landing' || surfaceRaw === 'contact' ? surfaceRaw : null;
        if (eventName === 'waitlist_route_preview_updated') {
          waitlistFunnel.preview_updates += 1;
          if (surface) waitlistBySurface[surface].preview_updates += 1;
        }
        if (eventName === 'waitlist_submit_attempted') {
          waitlistFunnel.submit_attempts += 1;
          if (surface) waitlistBySurface[surface].submit_attempts += 1;
        }
        if (eventName === 'waitlist_submit_succeeded') {
          waitlistFunnel.submit_successes += 1;
          if (surface) waitlistBySurface[surface].submit_successes += 1;
        }
      }
      if (eventName === 'marketing_snapshot_playbook_step_updated') {
        const playbookKeyRaw = properties.playbook_key;
        if (typeof playbookKeyRaw === 'string' && playbookKeyRaw.trim()) {
          activePlaybookKeys.add(playbookKeyRaw.trim().slice(0, 240));
        }
        if (properties.completed === true) {
          playbookCompletedSteps += 1;
          if (sessionId) playbookCompletionSessions.add(sessionId);
        }
      }
      if (eventName === 'marketing_snapshot_recovery_query_run') {
        recoveryRunCount += 1;
        if (sessionId) recoveryRunSessions.add(sessionId);
      }
      if (eventName === 'marketing_snapshot_recovery_escalation_run') {
        const actionIdRaw = properties.action_id;
        const actionId = (
          actionIdRaw === 'escalate_metadata_audit'
          || actionIdRaw === 'escalate_cta_trust'
          || actionIdRaw === 'escalate_followup_automation'
          || actionIdRaw === 'codify_recovery_playbook'
        )
          ? actionIdRaw
          : null;
        if (actionId) {
          const sourceRaw = properties.source;
          const source = sourceRaw === 'auto_run_default' ? 'auto_run_default' : 'manual_click';
          const entry = recoveryEscalationAttributionStore.get(actionId) ?? {
            total_runs: 0,
            manual_runs: 0,
            auto_runs: 0,
            sessions: new Set<string>(),
            last_run_ms: null,
          };
          entry.total_runs += 1;
          if (source === 'auto_run_default') entry.auto_runs += 1;
          else entry.manual_runs += 1;
          if (sessionId) entry.sessions.add(sessionId);
          if (Number.isFinite(createdAtMs)) {
            entry.last_run_ms = entry.last_run_ms === null ? createdAtMs : Math.max(entry.last_run_ms, createdAtMs);
          }
          recoveryEscalationAttributionStore.set(actionId, entry);
        }
      }

      if (eventName === 'ai_shortlist_generated') {
        const shortlistCount = toNumber(properties.shortlist_count, 0);
        if (shortlistCount > 0) {
          funnel.clicks += 0;
        }
      }

      daily.set(day, bucket);
    }

    const dailySeries = Array.from(daily.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, counts]) => ({ day, ...counts }));

    const firstHalf = dailySeries.slice(0, Math.max(1, Math.floor(dailySeries.length / 2)));
    const secondHalf = dailySeries.slice(Math.max(1, Math.floor(dailySeries.length / 2)));
    const firstSearches = firstHalf.reduce((sum, day) => sum + day.searches, 0);
    const secondSearches = secondHalf.reduce((sum, day) => sum + day.searches, 0);
    const trendDirection: 'up' | 'down' | 'flat' = secondSearches > firstSearches
      ? 'up'
      : secondSearches < firstSearches
        ? 'down'
        : 'flat';

    const top_events = Array.from(eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([event_name, count]) => ({ event_name, count }));
    const query_clusters = Array.from(queryClusterStore.values())
      .map((cluster): QueryClusterSummary => {
        const click_through_rate = cluster.searches > 0 ? Number((cluster.clicks / cluster.searches).toFixed(4)) : 0;
        const inquiry_rate = cluster.clicks > 0 ? Number((cluster.inquiries / cluster.clicks).toFixed(4)) : 0;
        const schedule_rate = cluster.inquiries > 0 ? Number((cluster.schedules / cluster.inquiries).toFixed(4)) : 0;
        const opportunity_score = computeOpportunityScore({
          key: cluster.key,
          searches: cluster.searches,
          click_through_rate,
          inquiry_rate,
          schedule_rate,
        });
        const sample_query = Array.from(cluster.sample_queries)[0] ?? cluster.label.toLowerCase();
        return {
          cluster_key: cluster.key,
          label: cluster.label,
          searches: cluster.searches,
          clicks: cluster.clicks,
          inquiries: cluster.inquiries,
          schedules: cluster.schedules,
          click_through_rate,
          inquiry_rate,
          schedule_rate,
          opportunity_score,
          sample_query,
          high_intent: HIGH_INTENT_CLUSTERS.has(cluster.key),
        };
      })
      .sort((a, b) => {
        if (b.opportunity_score !== a.opportunity_score) return b.opportunity_score - a.opportunity_score;
        if (b.searches !== a.searches) return b.searches - a.searches;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 8);
    const recommendations = query_clusters
      .filter((cluster) => cluster.searches > 0)
      .slice(0, 5)
      .map((cluster) => buildClusterRecommendation(cluster));

    const clickThroughRate = funnel.searches > 0 ? Number((funnel.clicks / funnel.searches).toFixed(4)) : 0;
    const inquiryRate = funnel.clicks > 0 ? Number((funnel.inquiries / funnel.clicks).toFixed(4)) : 0;
    const scheduleRate = funnel.inquiries > 0 ? Number((funnel.schedules / funnel.inquiries).toFixed(4)) : 0;
    const baselineCtr = toRate(baselineFunnel.clicks, baselineFunnel.searches);
    const followupCtr = toRate(followupFunnel.clicks, followupFunnel.searches);
    const baselineInquiryRate = toRate(baselineFunnel.inquiries, baselineFunnel.clicks);
    const followupInquiryRate = toRate(followupFunnel.inquiries, followupFunnel.clicks);
    const baselineScheduleRate = toRate(baselineFunnel.schedules, baselineFunnel.inquiries);
    const followupScheduleRate = toRate(followupFunnel.schedules, followupFunnel.inquiries);
    const recoveryBaselineCtr = toRate(recoveryBaselineFunnel.clicks, recoveryBaselineFunnel.searches);
    const recoveryFollowupCtr = toRate(recoveryFollowupFunnel.clicks, recoveryFollowupFunnel.searches);
    const recoveryBaselineInquiryRate = toRate(recoveryBaselineFunnel.inquiries, recoveryBaselineFunnel.clicks);
    const recoveryFollowupInquiryRate = toRate(recoveryFollowupFunnel.inquiries, recoveryFollowupFunnel.clicks);
    const recoveryBaselineScheduleRate = toRate(recoveryBaselineFunnel.schedules, recoveryBaselineFunnel.inquiries);
    const recoveryFollowupScheduleRate = toRate(recoveryFollowupFunnel.schedules, recoveryFollowupFunnel.inquiries);
    const hasPlaybookComparison = firstPlaybookCompletionAtMs !== null
      && baselineFunnel.searches >= 5
      && followupFunnel.searches >= 5;
    const playbookOutcomeConfidence: PlaybookOutcomeDelta['confidence'] = (
      baselineFunnel.searches >= 20 && followupFunnel.searches >= 20
    )
      ? 'high'
      : (
        baselineFunnel.searches >= 8 && followupFunnel.searches >= 8
      )
        ? 'medium'
        : 'low';
    const playbookOutcomeDelta: PlaybookOutcomeDelta = {
      completion_started_at: firstPlaybookCompletionAtMs !== null
        ? new Date(firstPlaybookCompletionAtMs).toISOString()
        : null,
      has_comparison: hasPlaybookComparison,
      baseline_searches: baselineFunnel.searches,
      followup_searches: followupFunnel.searches,
      click_through_rate_delta: hasPlaybookComparison ? Number((followupCtr - baselineCtr).toFixed(4)) : 0,
      inquiry_rate_delta: hasPlaybookComparison ? Number((followupInquiryRate - baselineInquiryRate).toFixed(4)) : 0,
      schedule_rate_delta: hasPlaybookComparison ? Number((followupScheduleRate - baselineScheduleRate).toFixed(4)) : 0,
      confidence: playbookOutcomeConfidence,
    };
    const hasRecoveryComparison = firstRecoveryRunAtMs !== null
      && recoveryBaselineFunnel.searches >= 5
      && recoveryFollowupFunnel.searches >= 5;
    const recoveryOutcomeConfidence: RecoveryOutcomeDelta['confidence'] = (
      recoveryBaselineFunnel.searches >= 20 && recoveryFollowupFunnel.searches >= 20
    )
      ? 'high'
      : (
        recoveryBaselineFunnel.searches >= 8 && recoveryFollowupFunnel.searches >= 8
      )
        ? 'medium'
        : 'low';
    const recoveryOutcomeDelta: RecoveryOutcomeDelta = {
      recovery_started_at: firstRecoveryRunAtMs !== null
        ? new Date(firstRecoveryRunAtMs).toISOString()
        : null,
      total_runs: recoveryRunCount,
      sessions_with_run: recoveryRunSessions.size,
      has_comparison: hasRecoveryComparison,
      baseline_searches: recoveryBaselineFunnel.searches,
      followup_searches: recoveryFollowupFunnel.searches,
      click_through_rate_delta: hasRecoveryComparison
        ? Number((recoveryFollowupCtr - recoveryBaselineCtr).toFixed(4))
        : 0,
      inquiry_rate_delta: hasRecoveryComparison
        ? Number((recoveryFollowupInquiryRate - recoveryBaselineInquiryRate).toFixed(4))
        : 0,
      schedule_rate_delta: hasRecoveryComparison
        ? Number((recoveryFollowupScheduleRate - recoveryBaselineScheduleRate).toFixed(4))
        : 0,
      confidence: recoveryOutcomeConfidence,
    };
    const previewToSubmitRate = waitlistFunnel.preview_updates > 0
      ? Number((waitlistFunnel.submit_attempts / waitlistFunnel.preview_updates).toFixed(4))
      : 0;
    const submitSuccessRate = waitlistFunnel.submit_attempts > 0
      ? Number((waitlistFunnel.submit_successes / waitlistFunnel.submit_attempts).toFixed(4))
      : 0;
    const funnelHealth = computeFunnelHealth({
      click_through_rate: clickThroughRate,
      inquiry_rate: inquiryRate,
      schedule_rate: scheduleRate,
      preview_to_submit_rate: previewToSubmitRate,
      preview_updates: waitlistFunnel.preview_updates,
    });
    const topQuery = recommendations[0]?.suggested_query ?? query_clusters[0]?.sample_query ?? '';
    const funnelFrictionAlerts = buildFunnelFrictionAlerts({
      funnel: {
        searches: funnel.searches,
        clicks: funnel.clicks,
        inquiries: funnel.inquiries,
        click_through_rate: clickThroughRate,
        inquiry_rate: inquiryRate,
        schedule_rate: scheduleRate,
      },
      waitlist_funnel: {
        preview_updates: waitlistFunnel.preview_updates,
        submit_attempts: waitlistFunnel.submit_attempts,
        submit_success_rate: submitSuccessRate,
        preview_to_submit_rate: previewToSubmitRate,
        by_surface: waitlistBySurface,
      },
      top_query: topQuery,
    });
    const automationRecommendations = buildAutomationRecommendations({
      trend_direction: trendDirection,
      funnel: {
        inquiries: funnel.inquiries,
        click_through_rate: clickThroughRate,
        schedule_rate: scheduleRate,
      },
      waitlist_funnel: {
        preview_updates: waitlistFunnel.preview_updates,
        submit_attempts: waitlistFunnel.submit_attempts,
        preview_to_submit_rate: previewToSubmitRate,
      },
    });
    const weeklyPlaybook = buildExecutionPlaybook({
      top_cluster: query_clusters[0],
      top_recommendation: recommendations[0],
      funnel: {
        searches: funnel.searches,
        inquiries: funnel.inquiries,
        schedules: funnel.schedules,
      },
    });
    const playbookRecoveryRecommendations = buildPlaybookRecoveryRecommendations({
      outcome: playbookOutcomeDelta,
      focus_query: weeklyPlaybook.focus_query,
    });
    const recoveryEscalationActions = buildRecoveryEscalationActions({
      recovery: recoveryOutcomeDelta,
      focus_query: weeklyPlaybook.focus_query,
      route: weeklyPlaybook.recommended_route,
    });
    const recoveryEscalationAttributionActions = Array.from(recoveryEscalationAttributionStore.entries())
      .map(([action_id, entry]): RecoveryEscalationAttributionAction => {
        const successScore = scoreEscalationAction(action_id, recoveryOutcomeDelta);
        const recommendedMode: RecoveryEscalationAttributionAction['recommended_mode'] = (
          recoveryOutcomeDelta.confidence === 'high'
          && successScore >= 60
          && entry.total_runs >= 2
        )
          ? 'auto'
          : 'manual';
        return {
          action_id,
          total_runs: entry.total_runs,
          manual_runs: entry.manual_runs,
          auto_runs: entry.auto_runs,
          sessions_with_run: entry.sessions.size,
          last_run_at: entry.last_run_ms !== null ? new Date(entry.last_run_ms).toISOString() : null,
          success_score: successScore,
          recommended_mode: recommendedMode,
        };
      })
      .sort((a, b) => {
        if (b.total_runs !== a.total_runs) return b.total_runs - a.total_runs;
        return a.action_id.localeCompare(b.action_id);
      });
    const recoveryEscalationAttribution: RecoveryEscalationAttribution = {
      total_runs: recoveryEscalationAttributionActions.reduce((sum, item) => sum + item.total_runs, 0),
      manual_runs: recoveryEscalationAttributionActions.reduce((sum, item) => sum + item.manual_runs, 0),
      auto_runs: recoveryEscalationAttributionActions.reduce((sum, item) => sum + item.auto_runs, 0),
      actions: recoveryEscalationAttributionActions,
    };
    const automationTuningRules = buildAutomationTuningRules({
      trend_direction: trendDirection,
      funnel_health_score: funnelHealth.funnel_health_score,
      funnel_click_through_rate: clickThroughRate,
      playbook_confidence: weeklyPlaybook.confidence,
      recovery: recoveryOutcomeDelta,
      escalation_attribution: recoveryEscalationAttribution,
    });
    const playbookExecution = {
      completed_steps: playbookCompletedSteps,
      sessions_with_completion: playbookCompletionSessions.size,
      active_playbooks: activePlaybookKeys.size,
      adoption_rate: sessionSet.size > 0
        ? Number((playbookCompletionSessions.size / sessionSet.size).toFixed(4))
        : 0,
    };

    return {
      summary: {
        window_days,
        total_events: rows.length,
        active_sessions: sessionSet.size,
        trend_direction: trendDirection,
        funnel_health_score: funnelHealth.funnel_health_score,
        top_bottleneck_stage: funnelHealth.top_bottleneck_stage,
      },
      top_events,
      funnel: {
        ...funnel,
        click_through_rate: clickThroughRate,
        inquiry_rate: inquiryRate,
        schedule_rate: scheduleRate,
      },
      waitlist_funnel: {
        ...waitlistFunnel,
        preview_to_submit_rate: previewToSubmitRate,
        submit_success_rate: submitSuccessRate,
        by_surface: waitlistBySurface,
      },
      query_clusters,
      recommendations,
      funnel_friction_alerts: funnelFrictionAlerts,
      automation_recommendations: automationRecommendations,
      automation_tuning_rules: automationTuningRules,
      weekly_playbook: weeklyPlaybook,
      playbook_outcome_delta: playbookOutcomeDelta,
      playbook_recovery_recommendations: playbookRecoveryRecommendations,
      recovery_outcome_delta: recoveryOutcomeDelta,
      recovery_escalation_actions: recoveryEscalationActions,
      recovery_escalation_attribution: recoveryEscalationAttribution,
      playbook_execution: playbookExecution,
      daily: dailySeries,
    };
  } catch {
    return buildFallback(window_days);
  }
}
