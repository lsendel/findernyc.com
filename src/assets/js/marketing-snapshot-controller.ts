import {
  normalizeWaitlistFollowUpRoute,
  type IntakeTeamSize,
  type IntakeUseCase,
  type WaitlistFollowUpRoute,
} from './intake-routing';
import type { MarketingSnapshotPreferences } from './marketing-snapshot-state';

type MarketingAutomationId =
  | 'auto_run_top_opportunity'
  | 'auto_create_saved_alert'
  | 'autofill_intake_profile'
  | 'instant_role_setup'
  | 'auto_schedule_after_inquiry';

type RecoveryRecommendationId = 'ctr_recovery' | 'inquiry_recovery' | 'schedule_recovery' | 'momentum_scale';

type RecoveryEscalationActionId =
  | 'escalate_metadata_audit'
  | 'escalate_cta_trust'
  | 'escalate_followup_automation'
  | 'codify_recovery_playbook';

type TuningRuleId =
  | 'tune_auto_run_top_opportunity'
  | 'tune_auto_run_recovery'
  | 'tune_auto_run_escalation'
  | 'tune_auto_apply_recommended';

type Confidence = 'high' | 'medium' | 'low';
type Priority = 'high' | 'medium' | 'low';

type MarketingSnapshotRenderInput = {
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
};

type MarketingSnapshotRenderHandlers = {
  onRunQuery: (query: string) => void;
  onRunRecoveryQuery: (input: {
    recommendation_id: RecoveryRecommendationId;
    priority: Priority;
    query_text: string;
    outcome_confidence: Confidence;
    source: 'manual_click' | 'auto_run_default';
  }) => void;
  onRunRecoveryEscalation: (input: {
    action_id: RecoveryEscalationActionId;
    priority: Priority;
    query_text: string;
    recovery_confidence: Confidence;
    source: 'manual_click' | 'auto_run_default';
  }) => void;
  onApplyAutomation: (id: MarketingAutomationId, source: 'manual_click' | 'auto_apply_defaults') => void;
  isAutomationEnabled: (id: MarketingAutomationId) => boolean;
};

type MarketingSnapshotPayload = {
  success: true;
  summary: {
    total_events: number;
    window_days: number;
  };
  weekly_playbook: {
    confidence: Confidence;
  };
  automation_recommendations: Array<{
    id: MarketingAutomationId;
    enabled_by_default: boolean;
  }>;
  automation_tuning_rules: Array<{
    id: TuningRuleId;
    setting: boolean;
    confidence: Confidence;
    cooldown_hours?: 6 | 12 | 24 | 48;
  }>;
  recovery_escalation_actions: Array<{
    id: RecoveryEscalationActionId;
    priority: Priority;
    suggested_query: string;
  }>;
  recovery_outcome_delta: {
    total_runs: number;
    has_comparison: boolean;
    confidence: Confidence;
    click_through_rate_delta: number;
    inquiry_rate_delta: number;
    schedule_rate_delta: number;
  };
  recovery_escalation_attribution: {
    total_runs: number;
    manual_runs: number;
    auto_runs: number;
    actions: Array<{
      action_id: RecoveryEscalationActionId;
      success_score: number;
      recommended_mode: 'manual' | 'auto';
    }>;
  };
  playbook_recovery_recommendations: Array<{
    id: RecoveryRecommendationId;
    priority: Priority;
    suggested_query: string;
  }>;
  playbook_outcome_delta: {
    has_comparison: boolean;
    confidence: Confidence;
  };
  recommendations: Array<{
    suggested_query: string;
  }>;
  query_clusters: Array<{
    sample_query: string;
  }>;
};

type TrackEventPayload =
  | {
    event_name: 'marketing_snapshot_recovery_query_run';
    properties: {
      surface: 'landing';
      recommendation_id: RecoveryRecommendationId;
      priority: Priority;
      query_text: string;
      outcome_confidence: Confidence;
      source: 'manual_click' | 'auto_run_default';
    };
  }
  | {
    event_name: 'marketing_snapshot_recovery_escalation_run';
    properties: {
      surface: 'landing';
      action_id: RecoveryEscalationActionId;
      priority: Priority;
      query_text: string;
      recovery_confidence: Confidence;
      source: 'manual_click' | 'auto_run_default';
    };
  }
  | {
    event_name: 'marketing_snapshot_automation_applied';
    properties: {
      surface: 'landing';
      automation_id: MarketingAutomationId;
      enabled: boolean;
      source: 'manual_click' | 'auto_apply_defaults';
    };
  }
  | {
    event_name: 'marketing_snapshot_playbook_intake_opened';
    properties: {
      surface: 'landing';
      use_case: IntakeUseCase;
      team_size: IntakeTeamSize;
      route: WaitlistFollowUpRoute;
      confidence: Confidence;
    };
  }
  | {
    event_name: 'marketing_snapshot_tuning_rule_applied';
    properties: {
      surface: 'landing';
      rule_id: TuningRuleId;
      setting: boolean;
      confidence: Confidence;
      source: 'auto_apply_rule' | 'manual_sync';
    };
  };

type InitMarketingSnapshotControllerOptions<TPayload extends MarketingSnapshotPayload> = {
  preferences_storage_key: string;
  readMarketingSnapshotPreferences: (storageKey: string) => MarketingSnapshotPreferences;
  writeMarketingSnapshotPreferences: (
    storageKey: string,
    preferences: MarketingSnapshotPreferences,
  ) => void;
  requestInsightsHub: (
    window_days: number,
  ) => Promise<{
    status: number;
    body: TPayload | { success?: false; error?: string } | null;
  }>;
  renderMarketingSnapshotCards: (
    input: MarketingSnapshotRenderInput,
    handlers: MarketingSnapshotRenderHandlers,
    payload: TPayload | null,
  ) => void;
  trackCTA: (label: string, section: string) => void;
  trackEvent: (payload: TrackEventPayload) => Promise<void> | void;
  setStatusState: (
    element: HTMLElement,
    message: string,
    state: 'loading' | 'success' | 'warning' | 'error' | 'idle',
  ) => void;
};

function normalizeLeadUseCase(value: string | null | undefined): IntakeUseCase | undefined {
  if (value === 'consumer_discovery') return value;
  if (value === 'business_listing') return value;
  if (value === 'marketing_analytics') return value;
  if (value === 'agency_partnership') return value;
  return undefined;
}

function normalizeOnboardingTeamSize(value: string | null | undefined): IntakeTeamSize | undefined {
  if (value === 'solo') return value;
  if (value === 'small_2_10') return value;
  if (value === 'mid_11_50') return value;
  if (value === 'enterprise_50_plus') return value;
  return undefined;
}

const MARKETING_SNAPSHOT_AUTO_ESCALATION_STATE_KEY = 'localgems_marketing_snapshot_auto_escalation_state_v1';

function readLastAutoEscalationState(): {
  action_id: RecoveryEscalationActionId;
  triggered_at: string;
} | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MARKETING_SNAPSHOT_AUTO_ESCALATION_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as { action_id?: unknown; triggered_at?: unknown };
    const action_id = (
      record.action_id === 'escalate_metadata_audit'
      || record.action_id === 'escalate_cta_trust'
      || record.action_id === 'escalate_followup_automation'
      || record.action_id === 'codify_recovery_playbook'
    )
      ? record.action_id
      : null;
    const triggered_at = typeof record.triggered_at === 'string' ? record.triggered_at : null;
    if (!action_id || !triggered_at) return null;
    return { action_id, triggered_at };
  } catch {
    return null;
  }
}

function writeLastAutoEscalationState(input: {
  action_id: RecoveryEscalationActionId;
  triggered_at: string;
}): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MARKETING_SNAPSHOT_AUTO_ESCALATION_STATE_KEY, JSON.stringify(input));
  } catch {
    // Best-effort only.
  }
}

export function initMarketingSnapshotController<TPayload extends MarketingSnapshotPayload>(
  options: InitMarketingSnapshotControllerOptions<TPayload>,
): void {
  const section = document.getElementById('marketing-snapshot') as HTMLElement | null;
  const ctr = document.getElementById('marketing-snapshot-ctr') as HTMLElement | null;
  const inquiryRate = document.getElementById('marketing-snapshot-inquiry-rate') as HTMLElement | null;
  const scheduleRate = document.getElementById('marketing-snapshot-schedule-rate') as HTMLElement | null;
  const rankingOpportunity = document.getElementById('marketing-snapshot-ranking-opportunity') as HTMLElement | null;
  const windowText = document.getElementById('marketing-snapshot-window') as HTMLElement | null;
  const topEvents = document.getElementById('marketing-snapshot-top-events') as HTMLElement | null;
  const actions = document.getElementById('marketing-snapshot-actions') as HTMLElement | null;
  const alerts = document.getElementById('marketing-snapshot-alerts') as HTMLElement | null;
  const automations = document.getElementById('marketing-snapshot-automations') as HTMLElement | null;
  const tuningRules = document.getElementById('marketing-snapshot-tuning-rules') as HTMLElement | null;
  const automationState = document.getElementById('marketing-snapshot-automation-state') as HTMLElement | null;
  const playbook = document.getElementById('marketing-snapshot-playbook') as HTMLElement | null;
  const playbookProgress = document.getElementById('marketing-snapshot-playbook-progress') as HTMLElement | null;
  const playbookRecovery = document.getElementById('marketing-snapshot-playbook-recovery') as HTMLElement | null;
  const recoveryImpact = document.getElementById('marketing-snapshot-recovery-impact') as HTMLElement | null;
  const playbookIntakeLink = document.getElementById('marketing-snapshot-open-intake') as HTMLAnchorElement | null;
  const waitlistFunnel = document.getElementById('marketing-snapshot-waitlist-funnel') as HTMLElement | null;
  const status = document.getElementById('marketing-snapshot-status') as HTMLElement | null;
  const refresh = document.getElementById('marketing-snapshot-refresh') as HTMLButtonElement | null;
  const autoRunTopToggle = document.getElementById('marketing-snapshot-auto-run-top') as HTMLInputElement | null;
  const autoRunRecoveryToggle = document.getElementById('marketing-snapshot-auto-run-recovery') as HTMLInputElement | null;
  const autoRunEscalationToggle = document.getElementById('marketing-snapshot-auto-run-escalation') as HTMLInputElement | null;
  const autoRunEscalationCooldown = document.getElementById('marketing-snapshot-escalation-cooldown-hours') as HTMLSelectElement | null;
  const autoApplyRecommendedToggle = document.getElementById('marketing-snapshot-auto-apply-recommended') as HTMLInputElement | null;
  const pauseAutoRun6h = document.getElementById('marketing-snapshot-pause-auto-run-6h') as HTMLButtonElement | null;
  const pauseAutoRun24h = document.getElementById('marketing-snapshot-pause-auto-run-24h') as HTMLButtonElement | null;
  const resumeAutoRun = document.getElementById('marketing-snapshot-resume-auto-run') as HTMLButtonElement | null;
  const runNextAutoAction = document.getElementById('marketing-snapshot-run-next-auto-action') as HTMLButtonElement | null;
  const clearQueryRetryAuto = document.getElementById('marketing-snapshot-clear-query-retry-auto') as HTMLButtonElement | null;
  const applyTuningRulesNow = document.getElementById('marketing-snapshot-apply-tuning-rules-now') as HTMLButtonElement | null;
  const autoRunPauseState = document.getElementById('marketing-snapshot-auto-run-pause-state') as HTMLElement | null;
  const smartSearchSection = document.getElementById('smart-search') as HTMLElement | null;
  const smartSearchForm = document.getElementById('smart-search-form') as HTMLFormElement | null;
  const smartSearchQuery = document.getElementById('smart-search-query') as HTMLInputElement | null;
  const onboardingInstantApply = document.getElementById('onboarding-instant-apply') as HTMLInputElement | null;
  const onboardingAutoAlert = document.getElementById('onboarding-auto-alert') as HTMLInputElement | null;
  const onboardingAutofillLead = document.getElementById('onboarding-autofill-lead') as HTMLInputElement | null;
  const autoScheduleToggle = document.getElementById('smart-search-auto-schedule') as HTMLInputElement | null;

  if (
    !section
    || !ctr
    || !inquiryRate
    || !scheduleRate
    || !rankingOpportunity
    || !windowText
    || !topEvents
    || !actions
    || !alerts
    || !automations
    || !tuningRules
    || !automationState
    || !playbook
    || !playbookProgress
    || !playbookRecovery
    || !recoveryImpact
    || !playbookIntakeLink
    || !waitlistFunnel
    || !status
    || !autoRunPauseState
  ) {
    return;
  }

  const renderInput: MarketingSnapshotRenderInput = {
    ctr,
    inquiry_rate: inquiryRate,
    schedule_rate: scheduleRate,
    ranking_opportunity: rankingOpportunity,
    window: windowText,
    top_events: topEvents,
    actions,
    alerts,
    automations,
    tuning_rules: tuningRules,
    automation_state: automationState,
    playbook,
    playbook_progress: playbookProgress,
    playbook_recovery: playbookRecovery,
    recovery_impact: recoveryImpact,
    intake_link: playbookIntakeLink,
    waitlist_funnel: waitlistFunnel,
    status,
  };

  const runQuery = (query: string): void => {
    const normalized = query.trim();
    if (!normalized || !smartSearchQuery || !smartSearchForm) return;
    smartSearchQuery.value = normalized;
    if (smartSearchSection) {
      smartSearchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    options.trackCTA('marketing-snapshot-run-query', 'marketing-snapshot');
    smartSearchForm.requestSubmit();
  };

  const runRecoveryQuery = (input: {
    recommendation_id: RecoveryRecommendationId;
    priority: Priority;
    query_text: string;
    outcome_confidence: Confidence;
    source: 'manual_click' | 'auto_run_default';
  }): void => {
    options.trackCTA(
      input.source === 'auto_run_default'
        ? 'marketing-snapshot-auto-run-recovery-query'
        : 'marketing-snapshot-run-recovery-query',
      'marketing-snapshot',
    );
    void options.trackEvent({
      event_name: 'marketing_snapshot_recovery_query_run',
      properties: {
        surface: 'landing',
        recommendation_id: input.recommendation_id,
        priority: input.priority,
        query_text: input.query_text.slice(0, 180),
        outcome_confidence: input.outcome_confidence,
        source: input.source,
      },
    });
    runQuery(input.query_text);
  };

  const runRecoveryEscalation = (input: {
    action_id: RecoveryEscalationActionId;
    priority: Priority;
    query_text: string;
    recovery_confidence: Confidence;
    source: 'manual_click' | 'auto_run_default';
  }): void => {
    options.trackCTA(
      input.source === 'auto_run_default'
        ? 'marketing-snapshot-auto-run-recovery-escalation'
        : 'marketing-snapshot-run-recovery-escalation',
      'marketing-snapshot',
    );
    void options.trackEvent({
      event_name: 'marketing_snapshot_recovery_escalation_run',
      properties: {
        surface: 'landing',
        action_id: input.action_id,
        priority: input.priority,
        query_text: input.query_text.slice(0, 180),
        recovery_confidence: input.recovery_confidence,
        source: input.source,
      },
    });
    runQuery(input.query_text);
  };

  const enableToggle = (toggle: HTMLInputElement | null): boolean => {
    if (!toggle) return false;
    if (!toggle.checked) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  };

  const isAutomationEnabled = (id: MarketingAutomationId): boolean => {
    if (id === 'auto_run_top_opportunity') return autoRunTopToggle?.checked ?? false;
    if (id === 'auto_create_saved_alert') return onboardingAutoAlert?.checked ?? false;
    if (id === 'autofill_intake_profile') return onboardingAutofillLead?.checked ?? false;
    if (id === 'instant_role_setup') return onboardingInstantApply?.checked ?? false;
    if (id === 'auto_schedule_after_inquiry') return autoScheduleToggle?.checked ?? false;
    return false;
  };

  const applyAutomation = (id: MarketingAutomationId, source: 'manual_click' | 'auto_apply_defaults'): void => {
    let applied = false;
    if (id === 'auto_run_top_opportunity') {
      applied = enableToggle(autoRunTopToggle);
    } else if (id === 'auto_create_saved_alert') {
      applied = enableToggle(onboardingAutoAlert);
    } else if (id === 'autofill_intake_profile') {
      applied = enableToggle(onboardingAutofillLead);
    } else if (id === 'instant_role_setup') {
      applied = enableToggle(onboardingInstantApply);
    } else if (id === 'auto_schedule_after_inquiry') {
      applied = enableToggle(autoScheduleToggle);
    }
    if (applied) {
      options.setStatusState(status, `Automation default applied: ${id}.`, 'success');
      options.trackCTA(`marketing-snapshot-apply-${id}`, 'marketing-snapshot');
      void options.trackEvent({
        event_name: 'marketing_snapshot_automation_applied',
        properties: {
          surface: 'landing',
          automation_id: id,
          enabled: isAutomationEnabled(id),
          source,
        },
      });
      return;
    }
    options.setStatusState(status, `Automation control unavailable for ${id}.`, 'warning');
  };

  let lastAutoRunFingerprint = '';
  let lastAutoRecoveryRunFingerprint = '';
  let lastAutoEscalationFingerprint = '';
  let lastAutoTuningFingerprint = '';
  let lastAutoApplyFingerprint = '';
  let latestPayload: TPayload | null = null;
  const initialPreferences = options.readMarketingSnapshotPreferences(options.preferences_storage_key);
  let autoRunPauseUntilIso = initialPreferences.auto_run_pause_until;
  const readEscalationCooldownHours = (): 6 | 12 | 24 | 48 => {
    const raw = autoRunEscalationCooldown?.value ?? '24';
    if (raw === '6' || raw === '12' || raw === '24' || raw === '48') return Number(raw) as 6 | 12 | 24 | 48;
    return 24;
  };
  const applyTuningRule = (
    rule: MarketingSnapshotPayload['automation_tuning_rules'][number],
    source: 'auto_apply_rule' | 'manual_sync',
  ): boolean => {
    const setToggle = (toggle: HTMLInputElement | null, value: boolean): boolean => {
      if (!toggle || toggle.checked === value) return false;
      toggle.checked = value;
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    let changed = false;
    if (rule.id === 'tune_auto_run_top_opportunity') {
      changed = setToggle(autoRunTopToggle, rule.setting);
    } else if (rule.id === 'tune_auto_run_recovery') {
      changed = setToggle(autoRunRecoveryToggle, rule.setting);
    } else if (rule.id === 'tune_auto_run_escalation') {
      changed = setToggle(autoRunEscalationToggle, rule.setting);
      if (autoRunEscalationCooldown && typeof rule.cooldown_hours === 'number') {
        const nextCooldown = String(rule.cooldown_hours);
        if (autoRunEscalationCooldown.value !== nextCooldown) {
          autoRunEscalationCooldown.value = nextCooldown;
          autoRunEscalationCooldown.dispatchEvent(new Event('change', { bubbles: true }));
          changed = true;
        }
      }
    } else if (rule.id === 'tune_auto_apply_recommended') {
      changed = setToggle(autoApplyRecommendedToggle, rule.setting);
    }
    if (changed) {
      void options.trackEvent({
        event_name: 'marketing_snapshot_tuning_rule_applied',
        properties: {
          surface: 'landing',
          rule_id: rule.id,
          setting: rule.setting,
          confidence: rule.confidence,
          source,
        },
      });
    }
    return changed;
  };
  const syncMarketingSnapshotPreferences = (): void => {
    options.writeMarketingSnapshotPreferences(options.preferences_storage_key, {
      auto_run_top_opportunity: autoRunTopToggle?.checked ?? true,
      auto_run_recovery: autoRunRecoveryToggle?.checked ?? true,
      auto_run_escalation: autoRunEscalationToggle?.checked ?? true,
      escalation_cooldown_hours: readEscalationCooldownHours(),
      auto_apply_recommended: autoApplyRecommendedToggle?.checked ?? true,
      auto_run_pause_until: autoRunPauseUntilIso,
    });
  };
  const readActiveAutoRunPauseUntilMs = (): number | null => {
    if (!autoRunPauseUntilIso) return null;
    const pauseUntilMs = new Date(autoRunPauseUntilIso).getTime();
    if (!Number.isFinite(pauseUntilMs) || pauseUntilMs <= Date.now()) {
      autoRunPauseUntilIso = null;
      syncMarketingSnapshotPreferences();
      return null;
    }
    return pauseUntilMs;
  };
  const renderAutoRunPauseState = (): void => {
    const pauseUntilMs = readActiveAutoRunPauseUntilMs();
    if (pauseUntilMs === null) {
      autoRunPauseState.textContent = 'Auto-runs active.';
      if (resumeAutoRun) resumeAutoRun.disabled = true;
      return;
    }
    autoRunPauseState.textContent = `Auto-runs paused until ${new Date(pauseUntilMs).toLocaleString()}. Manual actions remain available.`;
    if (resumeAutoRun) resumeAutoRun.disabled = false;
  };
  const renderAutomationExecutionState = (lines: string[]): void => {
    while (automationState.firstChild) automationState.removeChild(automationState.firstChild);
    if (lines.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'saved-search-item ui-list-state ui-list-state-idle';
      empty.textContent = 'No automation execution diagnostics available.';
      automationState.appendChild(empty);
      return;
    }
    for (const line of lines) {
      const item = document.createElement('li');
      item.className = 'saved-search-item';
      item.textContent = line;
      automationState.appendChild(item);
    }
  };
  const computeAutomationExecutionState = (payload: TPayload): {
    low_confidence_playbook: boolean;
    tuning_rules: TPayload['automation_tuning_rules'];
    auto_apply_enabled: boolean;
    auto_apply_targets: MarketingAutomationId[];
    auto_run_top_enabled: boolean;
    auto_run_recovery_enabled: boolean;
    auto_run_escalation_enabled: boolean;
    suggested_query: string;
    recovery_recommendation: TPayload['playbook_recovery_recommendations'][number] | undefined;
    outcome_comparison_ready: boolean;
    outcome_confidence: Confidence;
    recovery_outcome: TPayload['recovery_outcome_delta'];
    escalation_recommendation: TPayload['recovery_escalation_actions'][number] | undefined;
    cooldown_hours: 6 | 12 | 24 | 48;
    within_escalation_cooldown: boolean;
    escalation_failsafe_ready: boolean;
    search_input_empty: boolean;
    pause_until_ms: number | null;
    cooldown_remaining_hours: number;
    diagnostics_lines: string[];
    next_ready_action: 'escalation' | 'recovery' | 'top' | null;
  } => {
    const lowConfidencePlaybook = payload.weekly_playbook.confidence === 'low';
    const tuningRules = payload.automation_tuning_rules;
    const autoApplyEnabled = autoApplyRecommendedToggle ? autoApplyRecommendedToggle.checked : true;
    const autoApplyTargets = payload.automation_recommendations
      .filter((item) => item.enabled_by_default)
      .map((item) => item.id);
    const autoRunEnabled = autoRunTopToggle ? autoRunTopToggle.checked : true;
    const autoRunRecoveryEnabled = autoRunRecoveryToggle ? autoRunRecoveryToggle.checked : true;
    const autoRunEscalationEnabled = autoRunEscalationToggle ? autoRunEscalationToggle.checked : true;
    const suggestedQuery = payload.recommendations[0]?.suggested_query
      ?? payload.query_clusters[0]?.sample_query
      ?? '';
    const recoveryRecommendation = payload.playbook_recovery_recommendations.find((item) => item.priority === 'high')
      ?? payload.playbook_recovery_recommendations[0];
    const outcomeComparisonReady = payload.playbook_outcome_delta.has_comparison;
    const outcomeConfidence = payload.playbook_outcome_delta.confidence;
    const recoveryOutcome = payload.recovery_outcome_delta;
    const escalationRecommendation = payload.recovery_escalation_actions.find((item) => item.priority === 'high')
      ?? payload.recovery_escalation_actions[0];
    const cooldownHours = readEscalationCooldownHours();
    const lastAutoEscalationState = readLastAutoEscalationState();
    const lastAutoEscalationAtMs = lastAutoEscalationState
      ? new Date(lastAutoEscalationState.triggered_at).getTime()
      : NaN;
    const withinEscalationCooldown = (
      !!lastAutoEscalationState
      && Number.isFinite(lastAutoEscalationAtMs)
      && (Date.now() - lastAutoEscalationAtMs) < (cooldownHours * 60 * 60 * 1000)
    );
    const escalationFailSafeReady = (
      recoveryOutcome.has_comparison
      && recoveryOutcome.confidence === 'high'
      && recoveryOutcome.total_runs >= 2
      && (
        recoveryOutcome.click_through_rate_delta <= 0
        || recoveryOutcome.inquiry_rate_delta <= 0
        || recoveryOutcome.schedule_rate_delta <= 0
      )
    );
    const searchInputEmpty = !!smartSearchQuery && !smartSearchQuery.value.trim();
    const pauseUntilMs = readActiveAutoRunPauseUntilMs();
    const cooldownRemainingHours = withinEscalationCooldown && Number.isFinite(lastAutoEscalationAtMs)
      ? Math.max(1, Math.ceil(((lastAutoEscalationAtMs + (cooldownHours * 60 * 60 * 1000)) - Date.now()) / (60 * 60 * 1000)))
      : 0;
    const canRunEscalation = (
      pauseUntilMs === null
      && autoRunEscalationEnabled
      && !lowConfidencePlaybook
      && escalationFailSafeReady
      && !!escalationRecommendation
      && searchInputEmpty
      && !withinEscalationCooldown
    );
    const canRunRecovery = (
      pauseUntilMs === null
      && autoRunRecoveryEnabled
      && !lowConfidencePlaybook
      && outcomeComparisonReady
      && outcomeConfidence !== 'low'
      && !!recoveryRecommendation
      && searchInputEmpty
    );
    const canRunTop = (
      pauseUntilMs === null
      && autoRunEnabled
      && !lowConfidencePlaybook
      && !!suggestedQuery
      && searchInputEmpty
    );
    const nextReadyAction: 'escalation' | 'recovery' | 'top' | null = canRunEscalation
      ? 'escalation'
      : canRunRecovery
        ? 'recovery'
        : canRunTop
          ? 'top'
          : null;
    const diagnosticsLines: string[] = [
      pauseUntilMs === null
        ? 'Global auto-runs: ACTIVE.'
        : `Global auto-runs: PAUSED until ${new Date(pauseUntilMs).toLocaleString()}.`,
      `Tuning-rule auto-apply: ${tuningRules.length} rule(s) available • ${lowConfidencePlaybook ? 'blocked by low playbook confidence' : 'eligible this refresh cycle'}.`,
      `Default automation auto-apply: ${autoApplyEnabled ? 'ENABLED' : 'DISABLED'} • ${autoApplyTargets.length} default target(s).`,
      `Top-opportunity auto-run: ${autoRunEnabled ? 'ON' : 'OFF'} • ${
        pauseUntilMs !== null
          ? 'blocked by global pause'
          : !autoRunEnabled
            ? 'toggle disabled'
            : lowConfidencePlaybook
              ? 'blocked by low playbook confidence'
              : !searchInputEmpty
                ? 'blocked because search input already has a query'
                : suggestedQuery
                  ? 'ready'
                  : 'blocked because no suggested query is available'
      }.`,
      `Recovery auto-run: ${autoRunRecoveryEnabled ? 'ON' : 'OFF'} • ${
        pauseUntilMs !== null
          ? 'blocked by global pause'
          : !autoRunRecoveryEnabled
            ? 'toggle disabled'
            : lowConfidencePlaybook
              ? 'blocked by low playbook confidence'
              : !outcomeComparisonReady
                ? 'blocked until outcome comparison is available'
                : outcomeConfidence === 'low'
                  ? 'blocked due to low outcome confidence'
                  : !recoveryRecommendation
                    ? 'blocked because no recovery recommendation is available'
                    : !searchInputEmpty
                      ? 'blocked because search input already has a query'
                      : 'ready'
      }.`,
      `Escalation auto-run: ${autoRunEscalationEnabled ? 'ON' : 'OFF'} • ${
        pauseUntilMs !== null
          ? 'blocked by global pause'
          : !autoRunEscalationEnabled
            ? 'toggle disabled'
            : lowConfidencePlaybook
              ? 'blocked by low playbook confidence'
              : !escalationFailSafeReady
                ? 'blocked until fail-safe gates pass (high confidence, >=2 recovery runs, unresolved deltas)'
                : !escalationRecommendation
                  ? 'blocked because no escalation recommendation is available'
                  : !searchInputEmpty
                    ? 'blocked because search input already has a query'
                    : withinEscalationCooldown
                      ? `blocked by cooldown (${cooldownRemainingHours}h remaining)`
                      : 'ready'
      }.`,
      nextReadyAction
        ? `Next ready auto action: ${nextReadyAction}.`
        : 'Next ready auto action: none (all gated or disabled).',
    ];
    return {
      low_confidence_playbook: lowConfidencePlaybook,
      tuning_rules: tuningRules,
      auto_apply_enabled: autoApplyEnabled,
      auto_apply_targets: autoApplyTargets,
      auto_run_top_enabled: autoRunEnabled,
      auto_run_recovery_enabled: autoRunRecoveryEnabled,
      auto_run_escalation_enabled: autoRunEscalationEnabled,
      suggested_query: suggestedQuery,
      recovery_recommendation: recoveryRecommendation,
      outcome_comparison_ready: outcomeComparisonReady,
      outcome_confidence: outcomeConfidence,
      recovery_outcome: recoveryOutcome,
      escalation_recommendation: escalationRecommendation,
      cooldown_hours: cooldownHours,
      within_escalation_cooldown: withinEscalationCooldown,
      escalation_failsafe_ready: escalationFailSafeReady,
      search_input_empty: searchInputEmpty,
      pause_until_ms: pauseUntilMs,
      cooldown_remaining_hours: cooldownRemainingHours,
      diagnostics_lines: diagnosticsLines,
      next_ready_action: nextReadyAction,
    };
  };
  const setAutoRunPause = (hours: 6 | 24 | null): void => {
    if (hours === null) {
      autoRunPauseUntilIso = null;
      syncMarketingSnapshotPreferences();
      renderAutoRunPauseState();
      options.setStatusState(status, 'Auto-run defaults resumed.', 'success');
      options.trackCTA('marketing-snapshot-resume-auto-runs', 'marketing-snapshot');
      return;
    }
    autoRunPauseUntilIso = new Date(Date.now() + (hours * 60 * 60 * 1000)).toISOString();
    syncMarketingSnapshotPreferences();
    renderAutoRunPauseState();
    const pauseUntilLabel = new Date(autoRunPauseUntilIso!).toLocaleString();
    options.setStatusState(
      status,
      `Auto-run defaults paused until ${pauseUntilLabel}.`,
      'warning',
    );
    options.trackCTA(`marketing-snapshot-pause-auto-runs-${hours}h`, 'marketing-snapshot');
  };
  if (autoRunTopToggle) {
    autoRunTopToggle.checked = initialPreferences.auto_run_top_opportunity;
    autoRunTopToggle.addEventListener('change', syncMarketingSnapshotPreferences);
  }
  if (autoRunRecoveryToggle) {
    autoRunRecoveryToggle.checked = initialPreferences.auto_run_recovery;
    autoRunRecoveryToggle.addEventListener('change', syncMarketingSnapshotPreferences);
  }
  if (autoRunEscalationToggle) {
    autoRunEscalationToggle.checked = initialPreferences.auto_run_escalation;
    autoRunEscalationToggle.addEventListener('change', syncMarketingSnapshotPreferences);
  }
  if (autoRunEscalationCooldown) {
    autoRunEscalationCooldown.value = String(initialPreferences.escalation_cooldown_hours);
    autoRunEscalationCooldown.addEventListener('change', syncMarketingSnapshotPreferences);
  }
  if (autoApplyRecommendedToggle) {
    autoApplyRecommendedToggle.checked = initialPreferences.auto_apply_recommended;
    autoApplyRecommendedToggle.addEventListener('change', syncMarketingSnapshotPreferences);
  }
  pauseAutoRun6h?.addEventListener('click', () => {
    setAutoRunPause(6);
  });
  pauseAutoRun24h?.addEventListener('click', () => {
    setAutoRunPause(24);
  });
  resumeAutoRun?.addEventListener('click', () => {
    setAutoRunPause(null);
  });
  runNextAutoAction?.addEventListener('click', () => {
    options.trackCTA('marketing-snapshot-run-next-auto-action', 'marketing-snapshot');
    if (!latestPayload) {
      options.setStatusState(status, 'Load marketing metrics before running the next auto action.', 'warning');
      return;
    }
    const execution = computeAutomationExecutionState(latestPayload);
    renderAutomationExecutionState(execution.diagnostics_lines);
    if (execution.pause_until_ms !== null) {
      options.setStatusState(
        status,
        `Auto-runs are paused until ${new Date(execution.pause_until_ms).toLocaleString()}. Resume auto-runs first.`,
        'warning',
      );
      return;
    }
    if (!execution.search_input_empty) {
      options.setStatusState(status, 'Search input already has a query. Clear it first to run the next auto action.', 'warning');
      return;
    }
    if (execution.next_ready_action === 'escalation' && execution.escalation_recommendation) {
      options.setStatusState(
        status,
        `Running next auto action now: escalation query "${execution.escalation_recommendation.suggested_query}".`,
        'loading',
      );
      runRecoveryEscalation({
        action_id: execution.escalation_recommendation.id,
        priority: execution.escalation_recommendation.priority,
        query_text: execution.escalation_recommendation.suggested_query,
        recovery_confidence: execution.recovery_outcome.confidence,
        source: 'manual_click',
      });
      return;
    }
    if (execution.next_ready_action === 'recovery' && execution.recovery_recommendation) {
      options.setStatusState(
        status,
        `Running next auto action now: recovery query "${execution.recovery_recommendation.suggested_query}".`,
        'loading',
      );
      runRecoveryQuery({
        recommendation_id: execution.recovery_recommendation.id,
        priority: execution.recovery_recommendation.priority,
        query_text: execution.recovery_recommendation.suggested_query,
        outcome_confidence: execution.outcome_confidence,
        source: 'manual_click',
      });
      return;
    }
    if (execution.next_ready_action === 'top' && execution.suggested_query) {
      options.setStatusState(
        status,
        `Running next auto action now: top-opportunity query "${execution.suggested_query}".`,
        'loading',
      );
      runQuery(execution.suggested_query);
      return;
    }
    options.setStatusState(
      status,
      'No auto action is currently ready. Review Automation Execution State diagnostics.',
      'warning',
    );
  });
  clearQueryRetryAuto?.addEventListener('click', () => {
    options.trackCTA('marketing-snapshot-clear-query-retry-auto', 'marketing-snapshot');
    if (!smartSearchQuery) {
      options.setStatusState(status, 'Search query input is unavailable for retry.', 'warning');
      return;
    }
    smartSearchQuery.value = '';
    options.setStatusState(status, 'Cleared search query. Re-evaluating auto-run gates...', 'loading');
    void load();
  });
  applyTuningRulesNow?.addEventListener('click', () => {
    options.trackCTA('marketing-snapshot-apply-tuning-rules-now', 'marketing-snapshot');
    if (!latestPayload) {
      options.setStatusState(status, 'Load marketing metrics before applying tuning rules.', 'warning');
      return;
    }
    if (latestPayload.automation_tuning_rules.length === 0) {
      options.setStatusState(status, 'No tuning rules available in the current window.', 'idle');
      return;
    }
    let changedCount = 0;
    for (const rule of latestPayload.automation_tuning_rules) {
      if (applyTuningRule(rule, 'manual_sync')) changedCount += 1;
    }
    const execution = computeAutomationExecutionState(latestPayload);
    renderAutomationExecutionState(execution.diagnostics_lines);
    if (changedCount > 0) {
      options.setStatusState(
        status,
        `Applied tuning rules: ${changedCount}/${latestPayload.automation_tuning_rules.length} control(s) updated.`,
        'success',
      );
      return;
    }
    options.setStatusState(status, 'Tuning controls already match the recommended rules.', 'idle');
  });
  renderAutoRunPauseState();

  const handlers: MarketingSnapshotRenderHandlers = {
    onRunQuery: runQuery,
    onRunRecoveryQuery: runRecoveryQuery,
    onRunRecoveryEscalation: runRecoveryEscalation,
    onApplyAutomation: applyAutomation,
    isAutomationEnabled,
  };

  const load = async (): Promise<void> => {
    options.setStatusState(status, 'Loading marketing metrics...', 'loading');
    const response = await options.requestInsightsHub(14);
    if (response.status !== 200 || !response.body || !('success' in response.body) || !response.body.success) {
      latestPayload = null;
      options.renderMarketingSnapshotCards(renderInput, handlers, null);
      const responseError = (
        response.body
        && typeof response.body === 'object'
        && 'error' in response.body
        && typeof response.body.error === 'string'
      ) ? response.body.error : null;
      options.setStatusState(
        status,
        responseError ? `Unable to load live metrics (${responseError}).` : 'Unable to load live metrics right now.',
        'error',
      );
      return;
    }

    const payload = response.body;
    latestPayload = payload;
    options.renderMarketingSnapshotCards(renderInput, handlers, payload);
    renderAutoRunPauseState();
    const execution = computeAutomationExecutionState(payload);
    renderAutomationExecutionState(execution.diagnostics_lines);
    if (execution.pause_until_ms !== null) {
      options.setStatusState(
        status,
        `Auto-run defaults are paused until ${new Date(execution.pause_until_ms).toLocaleString()}. Manual actions remain available.`,
        'warning',
      );
      return;
    }
    const lowConfidencePlaybook = execution.low_confidence_playbook;
    const tuningRules = execution.tuning_rules;
    const autoApplyEnabled = execution.auto_apply_enabled;
    const autoApplyTargets = execution.auto_apply_targets;
    const autoRunEnabled = execution.auto_run_top_enabled;
    const autoRunRecoveryEnabled = execution.auto_run_recovery_enabled;
    const autoRunEscalationEnabled = execution.auto_run_escalation_enabled;
    const suggestedQuery = execution.suggested_query;
    const recoveryRecommendation = execution.recovery_recommendation;
    const outcomeComparisonReady = execution.outcome_comparison_ready;
    const outcomeConfidence = execution.outcome_confidence;
    const recoveryOutcome = execution.recovery_outcome;
    const escalationRecommendation = execution.escalation_recommendation;
    const withinEscalationCooldown = execution.within_escalation_cooldown;
    const escalationFailSafeReady = execution.escalation_failsafe_ready;
    const searchInputEmpty = execution.search_input_empty;

    if (!lowConfidencePlaybook && tuningRules.length > 0) {
      const fingerprint = [
        payload.summary.total_events,
        payload.summary.window_days,
        ...tuningRules.map((rule) => `${rule.id}:${rule.setting ? '1' : '0'}:${rule.cooldown_hours ?? 'na'}`),
      ].join('|');
      if (fingerprint !== lastAutoTuningFingerprint) {
        lastAutoTuningFingerprint = fingerprint;
        for (const rule of tuningRules) {
          applyTuningRule(rule, 'auto_apply_rule');
        }
      }
    }

    if (autoApplyEnabled && !lowConfidencePlaybook && autoApplyTargets.length > 0) {
      const fingerprint = `${payload.summary.total_events}|${payload.summary.window_days}|${autoApplyTargets.join('|')}`;
      if (fingerprint !== lastAutoApplyFingerprint) {
        lastAutoApplyFingerprint = fingerprint;
        for (const automationId of autoApplyTargets) {
          if (!isAutomationEnabled(automationId)) {
            applyAutomation(automationId, 'auto_apply_defaults');
          }
        }
      }
    }

    if (
      autoRunEscalationEnabled
      && !lowConfidencePlaybook
      && escalationFailSafeReady
      && escalationRecommendation
      && searchInputEmpty
      && !withinEscalationCooldown
    ) {
      const fingerprint = [
        payload.summary.total_events,
        payload.summary.window_days,
        escalationRecommendation.id,
        escalationRecommendation.suggested_query,
        recoveryOutcome.confidence,
      ].join('|');
      if (fingerprint !== lastAutoEscalationFingerprint) {
        lastAutoEscalationFingerprint = fingerprint;
        options.setStatusState(
          status,
          `Auto-running escalation query: "${escalationRecommendation.suggested_query}".`,
          'loading',
        );
        runRecoveryEscalation({
          action_id: escalationRecommendation.id,
          priority: escalationRecommendation.priority,
          query_text: escalationRecommendation.suggested_query,
          recovery_confidence: recoveryOutcome.confidence,
          source: 'auto_run_default',
        });
        writeLastAutoEscalationState({
          action_id: escalationRecommendation.id,
          triggered_at: new Date().toISOString(),
        });
        return;
      }
    }

    if (
      autoRunRecoveryEnabled
      && !lowConfidencePlaybook
      && outcomeComparisonReady
      && outcomeConfidence !== 'low'
      && recoveryRecommendation
      && searchInputEmpty
    ) {
      const fingerprint = [
        payload.summary.total_events,
        payload.summary.window_days,
        recoveryRecommendation.id,
        recoveryRecommendation.suggested_query,
      ].join('|');
      if (fingerprint !== lastAutoRecoveryRunFingerprint) {
        lastAutoRecoveryRunFingerprint = fingerprint;
        options.setStatusState(
          status,
          `Auto-running recovery query: "${recoveryRecommendation.suggested_query}".`,
          'loading',
        );
        runRecoveryQuery({
          recommendation_id: recoveryRecommendation.id,
          priority: recoveryRecommendation.priority,
          query_text: recoveryRecommendation.suggested_query,
          outcome_confidence: outcomeConfidence,
          source: 'auto_run_default',
        });
        return;
      }
    }

    if (autoRunEnabled && !lowConfidencePlaybook && suggestedQuery && searchInputEmpty) {
      const fingerprint = `${payload.summary.total_events}|${payload.summary.window_days}|${suggestedQuery}`;
      if (fingerprint !== lastAutoRunFingerprint) {
        lastAutoRunFingerprint = fingerprint;
        options.setStatusState(status, `Auto-running top opportunity query: "${suggestedQuery}".`, 'loading');
        runQuery(suggestedQuery);
      }
    }
  };

  refresh?.addEventListener('click', () => {
    void load();
  });
  playbookIntakeLink.addEventListener('click', () => {
    const useCase = normalizeLeadUseCase(playbookIntakeLink.dataset.playbookUseCase);
    const teamSize = normalizeOnboardingTeamSize(playbookIntakeLink.dataset.playbookTeamSize);
    const route = normalizeWaitlistFollowUpRoute(playbookIntakeLink.dataset.playbookRoute);
    const confidenceRaw = playbookIntakeLink.dataset.playbookConfidence;
    const confidence = confidenceRaw === 'high' || confidenceRaw === 'medium' || confidenceRaw === 'low'
      ? confidenceRaw
      : undefined;
    if (!useCase || !teamSize || !route || !confidence) return;
    options.trackCTA('marketing-snapshot-open-playbook-intake', 'marketing-snapshot');
    void options.trackEvent({
      event_name: 'marketing_snapshot_playbook_intake_opened',
      properties: {
        surface: 'landing',
        use_case: useCase,
        team_size: teamSize,
        route,
        confidence,
      },
    });
  });

  void load();
}
