import {
  normalizeIntakeTeamSize,
  normalizeIntakeUseCase,
  normalizeWaitlistFollowUpRoute,
  resolveWaitlistFollowUpRoute,
  resolveWaitlistRouteAction,
  resolveWaitlistRoutePreviewText,
  resolveWaitlistSubmitLabel,
  type WaitlistFollowUpRoute,
} from './intake-routing';
import { setStatusState, type UiStatusState } from './ui-states';

const CONTACT_DRAFT_KEY = 'localgems_contact_form_draft_v1';
const JOURNEY_PROGRESS_KEY = 'localgems_journey_progress_v1';
const SESSION_ID_KEY = 'localgems_session_id';
const ONBOARDING_PREFERENCES_KEY = 'localgems_onboarding_preferences_v1';
const ONBOARDING_PROFILE_KEY = 'localgems_onboarding_profile_v1';

const ROLE_TO_USE_CASE: Record<string, string> = {
  consumer: 'consumer_discovery',
  marketer: 'marketing_analytics',
  business: 'business_listing',
};

type ContactGoalTemplate = {
  id: string;
  label: string;
  goal: string;
};

const CONTACT_GOAL_TEMPLATES: Record<string, ContactGoalTemplate[]> = {
  default: [
    {
      id: 'default_conversion_focus',
      label: 'Improve discovery-to-inquiry conversion quality this month.',
      goal: 'Improve discovery-to-inquiry conversion quality this month with clearer routing and faster follow-up.',
    },
    {
      id: 'default_local_visibility',
      label: 'Increase local visibility for high-intent event searches.',
      goal: 'Increase local visibility for high-intent event searches and convert qualified traffic into inquiries.',
    },
  ],
  consumer_discovery: [
    {
      id: 'consumer_weekly_plan',
      label: 'Find local events that match my weekly schedule.',
      goal: 'Find local events that match my weekly schedule and neighborhood preferences with less search time.',
    },
    {
      id: 'consumer_shortlist',
      label: 'Build a better shortlist for upcoming weekends.',
      goal: 'Build a better shortlist for upcoming weekends with reliable details and simple next actions.',
    },
  ],
  business_listing: [
    {
      id: 'business_listing_visibility',
      label: 'Increase listing visibility and booking conversion.',
      goal: 'Increase listing visibility and convert qualified discovery traffic into booking-ready inquiries.',
    },
    {
      id: 'business_operational_fit',
      label: 'Improve event operations and response speed.',
      goal: 'Improve event operations and response speed by routing inquiries into repeatable follow-up workflows.',
    },
  ],
  marketing_analytics: [
    {
      id: 'marketing_ctr_inquiry',
      label: 'Improve CTR and inquiry conversion for key queries.',
      goal: 'Improve CTR and inquiry conversion for key local search clusters over the next four weeks.',
    },
    {
      id: 'marketing_cluster_coverage',
      label: 'Prioritize high-intent cluster coverage gaps.',
      goal: 'Prioritize high-intent cluster coverage gaps and publish updates with measurable funnel impact.',
    },
  ],
  agency_partnership: [
    {
      id: 'partnership_rollout',
      label: 'Define partnership rollout scope and timeline.',
      goal: 'Define partnership rollout scope, governance milestones, and success metrics for pilot launch.',
    },
    {
      id: 'partnership_multi_program',
      label: 'Coordinate multi-program onboarding across teams.',
      goal: 'Coordinate multi-program onboarding across teams with clear routing, ownership, and weekly checkpoints.',
    },
  ],
};

type ContactRoutePlan = {
  title: string;
  responseTarget: string;
  steps: string[];
  guideHref: string;
  guideLabel: string;
};

function resolveRoutePlan(route: WaitlistFollowUpRoute): ContactRoutePlan {
  if (route === 'marketing_consult') {
    return {
      title: 'Marketing consult action plan',
      responseTarget: 'Response target: within 1 business day.',
      steps: [
        'Share your top query clusters and target geographies.',
        'Include baseline CTR, inquiry rate, and schedule-rate context if available.',
        'Prepare one page you want to improve first for rapid iteration.',
      ],
      guideHref: '/blog/llm-search-content-for-event-pages',
      guideLabel: 'Open LLM + SEO guide',
    };
  }
  if (route === 'sales_demo') {
    return {
      title: 'Sales demo onboarding plan',
      responseTarget: 'Response target: within 1-2 business days.',
      steps: [
        'List team goals and current workflow blockers.',
        'Identify required integrations and scheduling constraints.',
        'Prepare one representative campaign or event workflow for demo review.',
      ],
      guideHref: '/analytics',
      guideLabel: 'Open analytics demo page',
    };
  }
  if (route === 'partnership_review') {
    return {
      title: 'Partnership review plan',
      responseTarget: 'Response target: within 2 business days.',
      steps: [
        'Describe your program scope and expected listing volume.',
        'Share partner roles and approval process requirements.',
        'Outline rollout phases and success metrics for pilot launch.',
      ],
      guideHref: '/partnership',
      guideLabel: 'Open partnership overview',
    };
  }
  if (route === 'self_serve_onboarding') {
    return {
      title: 'Self-serve onboarding plan',
      responseTarget: 'Response target: immediate self-serve access.',
      steps: [
        'Run Smart Search with your main audience query.',
        'Create one saved alert for weekly monitoring.',
        'Submit one intake follow-up to unlock routing support.',
      ],
      guideHref: '/#smart-search',
      guideLabel: 'Go to Smart Search',
    };
  }
  return {
    title: 'Community waitlist plan',
    responseTarget: 'Response target: within 1 business day.',
    steps: [
      'Include your primary goal in one sentence.',
      'Add city or ZIP context so routing can prioritize local relevance.',
      'Use next-step guide links to prepare for onboarding.',
    ],
    guideHref: '/blog',
    guideLabel: 'Open practical guides',
  };
}

function resolveGoalTemplates(useCase: string): ContactGoalTemplate[] {
  const key = useCase && useCase in CONTACT_GOAL_TEMPLATES ? useCase : 'default';
  return CONTACT_GOAL_TEMPLATES[key] ?? CONTACT_GOAL_TEMPLATES.default;
}

function setStatus(element: HTMLElement | null, message: string, state: UiStatusState = 'idle'): void {
  setStatusState(element, message, state);
}

function readSessionId(): string | undefined {
  try {
    return localStorage.getItem(SESSION_ID_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function trackAnalytics(eventName: string, properties: Record<string, unknown>): void {
  if (navigator.doNotTrack === '1') return;
  const sessionId = readSessionId();
  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: eventName,
      properties,
      ...(sessionId ? { session_id: sessionId } : {}),
    }),
  }).catch(() => {});
}

function isValidZip(value: unknown): boolean {
  return /^\d{5}(-\d{4})?$/.test(String(value ?? '').trim());
}

function readDraft(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(CONTACT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(CONTACT_DRAFT_KEY);
  } catch {
    // Best effort only.
  }
}

function markContactSubmittedProgress(): void {
  try {
    const rawProgress = localStorage.getItem(JOURNEY_PROGRESS_KEY);
    const parsedProgress = rawProgress ? JSON.parse(rawProgress) : {};
    localStorage.setItem(JOURNEY_PROGRESS_KEY, JSON.stringify({
      ...(parsedProgress && typeof parsedProgress === 'object' ? parsedProgress : {}),
      contact_submitted_at: new Date().toISOString(),
    }));
    window.dispatchEvent(new Event('localgems:journey-update'));
  } catch {
    // Best effort only.
  }
}

function initContactPage(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const status = document.getElementById('contact-status');
  if (!form || !status) return;

  const emailInput = document.getElementById('email') as HTMLInputElement | null;
  const useCaseInput = document.getElementById('use_case') as HTMLSelectElement | null;
  const teamSizeInput = document.getElementById('team_size') as HTMLSelectElement | null;
  const cityInput = document.getElementById('city') as HTMLInputElement | null;
  const zipInput = document.getElementById('zip_code') as HTMLInputElement | null;
  const goalInput = document.getElementById('goal') as HTMLTextAreaElement | null;
  const nextAction = document.getElementById('contact-next-action') as HTMLAnchorElement | null;
  const routePreview = document.getElementById('contact-route-preview');
  const submitButton = document.getElementById('contact-submit-button') as HTMLButtonElement | null;
  const readinessScore = document.getElementById('contact-readiness-score');
  const readinessList = document.getElementById('contact-readiness-list') as HTMLUListElement | null;
  const goalTemplatePanel = document.getElementById('contact-goal-templates');
  const goalTemplateButtons = document.getElementById('contact-goal-template-buttons') as HTMLElement | null;
  const routePlanTitle = document.getElementById('contact-route-plan-title');
  const routeSla = document.getElementById('contact-route-sla');
  const routePlanList = document.getElementById('contact-route-plan-list') as HTMLUListElement | null;
  const routeGuide = document.getElementById('contact-route-guide') as HTMLAnchorElement | null;
  const routeHintMessage = document.getElementById('contact-route-hint');
  const routeRationaleMessage = document.getElementById('contact-route-rationale');

  const normalizeUseCase = (value: unknown): string => normalizeIntakeUseCase(value) ?? '';
  const normalizeTeamSize = (value: unknown): string => normalizeIntakeTeamSize(value) ?? '';
  const normalizeRoute = (value: unknown) => normalizeWaitlistFollowUpRoute(value) ?? 'community_waitlist';
  const normalizeConfidence = (value: unknown): 'high' | 'medium' | 'low' | undefined =>
    (value === 'high' || value === 'medium' || value === 'low') ? value : undefined;

  const params = new URLSearchParams(window.location.search);
  const urlUseCase = normalizeUseCase(params.get('use_case'));
  const urlTeamSize = normalizeTeamSize(params.get('team_size'));
  const urlCity = params.get('city');
  const urlGoal = params.get('goal');
  const playbookHintRoute = normalizeWaitlistFollowUpRoute(params.get('route_hint'));
  const playbookHintConfidence = normalizeConfidence(params.get('confidence'));
  const playbookHintRationale = params.get('rationale')?.trim().slice(0, 180) ?? '';

  const renderGoalTemplateButtons = (): void => {
    if (!goalTemplatePanel || !goalTemplateButtons || !goalInput) return;
    while (goalTemplateButtons.firstChild) goalTemplateButtons.removeChild(goalTemplateButtons.firstChild);
    const useCase = normalizeUseCase(useCaseInput?.value);
    const templates = resolveGoalTemplates(useCase);
    for (const template of templates) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline tap-target contact-goal-template-btn';
      button.setAttribute('data-goal-template-id', template.id);
      button.textContent = template.label;
      button.addEventListener('click', () => {
        goalInput.value = template.goal.slice(0, 180);
        goalInput.focus();
        goalInput.setSelectionRange(goalInput.value.length, goalInput.value.length);
        writeDraft();
        applyRoutingPreview();
        trackAnalytics('contact_goal_template_applied', {
          template_id: template.id,
          ...(useCase ? { use_case: useCase } : {}),
          goal_length: goalInput.value.length,
        });
      });
      goalTemplateButtons.appendChild(button);
    }
    goalTemplatePanel.hidden = templates.length === 0;
  };

  const renderRoutePlan = (route: WaitlistFollowUpRoute): void => {
    const plan = resolveRoutePlan(route);
    if (routePlanTitle) routePlanTitle.textContent = `Action plan: ${plan.title}.`;
    if (routeSla) routeSla.textContent = plan.responseTarget;
    if (routePlanList) {
      while (routePlanList.firstChild) routePlanList.removeChild(routePlanList.firstChild);
      for (const step of plan.steps) {
        const item = document.createElement('li');
        item.className = 'contact-route-plan-item';
        item.textContent = step;
        routePlanList.appendChild(item);
      }
    }
    if (routeGuide) {
      routeGuide.href = plan.guideHref;
      routeGuide.textContent = plan.guideLabel;
      routeGuide.hidden = false;
    }
  };

  let lastRoutePreviewFingerprint = '';
  let lastPlaybookRouteReconcileFingerprint = '';

  const writeDraft = (): void => {
    try {
      localStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify({
        email: String(emailInput?.value ?? '').slice(0, 120),
        city: String(cityInput?.value ?? '').slice(0, 100),
        zip_code: String(zipInput?.value ?? '').slice(0, 10),
        use_case: normalizeUseCase(useCaseInput?.value),
        team_size: normalizeTeamSize(teamSizeInput?.value),
        goal: String(goalInput?.value ?? '').slice(0, 180),
        updated_at: new Date().toISOString(),
      }));
    } catch {
      // Best effort only.
    }
  };

  const renderReadiness = (): void => {
    if (!readinessScore || !readinessList) return;
    while (readinessList.firstChild) readinessList.removeChild(readinessList.firstChild);

    const useCaseValue = normalizeUseCase(useCaseInput?.value);
    const teamSizeValue = normalizeTeamSize(teamSizeInput?.value);
    const goalValue = String(goalInput?.value ?? '').trim();
    const emailValid = Boolean(emailInput?.value && emailInput.checkValidity());
    const needsTeamSize =
      useCaseValue === 'business_listing'
      || useCaseValue === 'marketing_analytics'
      || useCaseValue === 'agency_partnership';

    const checks = [
      { label: 'Valid email provided', complete: emailValid },
      { label: 'Use case selected', complete: Boolean(useCaseValue) },
      { label: needsTeamSize ? 'Team size selected for this use case' : 'Team size context not required', complete: !needsTeamSize || Boolean(teamSizeValue) },
      { label: 'City or ZIP context included', complete: Boolean(String(cityInput?.value ?? '').trim() || isValidZip(zipInput?.value)) },
      { label: 'Goal includes at least 20 characters', complete: goalValue.length >= 20 },
    ];

    const completed = checks.filter((check) => check.complete).length;
    const score = Math.round((completed / checks.length) * 100);
    const readinessBand = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Basic' : 'Low';
    readinessScore.textContent = `Submission readiness: ${readinessBand} (${completed}/${checks.length})`;

    for (const check of checks) {
      const row = document.createElement('li');
      row.className = `contact-readiness-item${check.complete ? ' is-complete' : ''}`;
      row.textContent = check.label;
      readinessList.appendChild(row);
    }
  };

  const resolveRoutingContext = (): {
    route: ReturnType<typeof normalizeRoute>;
    useCase?: ReturnType<typeof normalizeIntakeUseCase>;
    teamSize?: ReturnType<typeof normalizeIntakeTeamSize>;
    submitLabel: string;
  } => {
    const route = resolveWaitlistFollowUpRoute({
      use_case: normalizeIntakeUseCase(useCaseInput?.value),
      team_size: normalizeIntakeTeamSize(teamSizeInput?.value),
      goal: String(goalInput?.value ?? ''),
    });
    const useCase = normalizeIntakeUseCase(useCaseInput?.value);
    const teamSize = normalizeIntakeTeamSize(teamSizeInput?.value);
    return {
      route,
      ...(useCase ? { useCase } : {}),
      ...(teamSize ? { teamSize } : {}),
      submitLabel: resolveWaitlistSubmitLabel(route),
    };
  };

  const applyRoutingPreview = (): void => {
    const routing = resolveRoutingContext();
    if (routePreview) routePreview.textContent = resolveWaitlistRoutePreviewText(routing.route);
    renderRoutePlan(routing.route);
    if (routeHintMessage) {
      if (!playbookHintRoute && !playbookHintRationale) {
        routeHintMessage.hidden = true;
      } else {
        const hintedRoute = playbookHintRoute ?? routing.route;
        const hintedLabel = hintedRoute.replaceAll('_', ' ');
        const resolvedLabel = routing.route.replaceAll('_', ' ');
        const confidenceSuffix = playbookHintConfidence ? ` (${playbookHintConfidence} confidence)` : '';
        const alignmentMessage = playbookHintRoute && playbookHintRoute !== routing.route
          ? `Playbook suggested ${hintedLabel}${confidenceSuffix}, adjusted to ${resolvedLabel} based on your current form inputs.`
          : `Playbook route alignment: ${hintedLabel}${confidenceSuffix}.`;
        const manualReviewSuffix = playbookHintConfidence === 'low'
          ? ' Confirm use case, team size, and goal before submitting.'
          : '';
        routeHintMessage.textContent = `${alignmentMessage}${manualReviewSuffix}`;
        routeHintMessage.hidden = false;
      }
    }
    if (routeRationaleMessage) {
      if (playbookHintRationale) {
        routeRationaleMessage.textContent = `Routing rationale: ${playbookHintRationale}`;
        routeRationaleMessage.hidden = false;
      } else {
        routeRationaleMessage.hidden = true;
      }
    }
    renderGoalTemplateButtons();
    if (submitButton) submitButton.textContent = routing.submitLabel;
    renderReadiness();

    const fingerprint = [
      'contact',
      routing.route,
      routing.submitLabel,
      routing.useCase ?? '',
      routing.teamSize ?? '',
    ].join('|');

    if (fingerprint !== lastRoutePreviewFingerprint) {
      lastRoutePreviewFingerprint = fingerprint;
      trackAnalytics('waitlist_route_preview_updated', {
        surface: 'contact',
        route: routing.route,
        submit_label: routing.submitLabel,
        ...(routing.useCase ? { use_case: routing.useCase } : {}),
        ...(routing.teamSize ? { team_size: routing.teamSize } : {}),
      });
    }

    if (playbookHintRoute) {
      const reconcileFingerprint = [
        playbookHintRoute,
        routing.route,
        playbookHintConfidence ?? '',
      ].join('|');
      if (reconcileFingerprint !== lastPlaybookRouteReconcileFingerprint) {
        lastPlaybookRouteReconcileFingerprint = reconcileFingerprint;
        trackAnalytics('contact_playbook_route_reconciled', {
          surface: 'contact',
          hinted_route: playbookHintRoute,
          resolved_route: routing.route,
          aligned: playbookHintRoute === routing.route,
          ...(playbookHintConfidence ? { confidence: playbookHintConfidence } : {}),
        });
      }
    }
  };

  if (useCaseInput && !useCaseInput.value && urlUseCase) useCaseInput.value = urlUseCase;
  if (teamSizeInput && !teamSizeInput.value && urlTeamSize) teamSizeInput.value = urlTeamSize;
  if (cityInput && !cityInput.value && urlCity) cityInput.value = urlCity.slice(0, 100);
  if (goalInput && !goalInput.value && urlGoal) goalInput.value = urlGoal.slice(0, 180);

  try {
    const prefRaw = localStorage.getItem(ONBOARDING_PREFERENCES_KEY);
    const autofillAllowed = !prefRaw || (() => {
      try {
        const prefs = JSON.parse(prefRaw) as Record<string, unknown>;
        return !(prefs && prefs.autofill_lead_enabled === false);
      } catch {
        return true;
      }
    })();
    const profileRaw = autofillAllowed ? localStorage.getItem(ONBOARDING_PROFILE_KEY) : null;
    if (profileRaw) {
      const profile = JSON.parse(profileRaw) as Record<string, unknown>;
      const role = typeof profile.role === 'string' ? profile.role : '';
      if (useCaseInput && !useCaseInput.value && role && ROLE_TO_USE_CASE[role]) {
        useCaseInput.value = ROLE_TO_USE_CASE[role];
      }
      if (teamSizeInput && !teamSizeInput.value && typeof profile.team_size === 'string') {
        teamSizeInput.value = profile.team_size;
      }
      if (cityInput && !cityInput.value && typeof profile.city === 'string') {
        cityInput.value = profile.city.slice(0, 100);
      }
      if (goalInput && !goalInput.value && role) {
        goalInput.value = role === 'marketer'
          ? 'Improve ranking coverage and inquiry conversion for high-intent local queries'
          : role === 'business'
            ? 'Increase listing visibility and convert discovery traffic into bookings'
            : 'Find local events that fit my weekly schedule and neighborhood preferences';
      }
    }
  } catch {
    // Best effort only.
  }

  const draft = readDraft();
  if (draft) {
    let restoredFields = 0;
    if (emailInput && !emailInput.value && typeof draft.email === 'string') {
      emailInput.value = draft.email.slice(0, 120);
      if (emailInput.value) restoredFields += 1;
    }
    if (cityInput && !cityInput.value && typeof draft.city === 'string') {
      cityInput.value = draft.city.slice(0, 100);
      if (cityInput.value) restoredFields += 1;
    }
    if (zipInput && !zipInput.value && typeof draft.zip_code === 'string') {
      zipInput.value = draft.zip_code.slice(0, 10);
      if (zipInput.value) restoredFields += 1;
    }
    if (useCaseInput && !useCaseInput.value && typeof draft.use_case === 'string') {
      const value = normalizeUseCase(draft.use_case);
      if (value) {
        useCaseInput.value = value;
        restoredFields += 1;
      }
    }
    if (teamSizeInput && !teamSizeInput.value && typeof draft.team_size === 'string') {
      const value = normalizeTeamSize(draft.team_size);
      if (value) {
        teamSizeInput.value = value;
        restoredFields += 1;
      }
    }
    if (goalInput && !goalInput.value && typeof draft.goal === 'string') {
      goalInput.value = draft.goal.slice(0, 180);
      if (goalInput.value) restoredFields += 1;
    }
    if (restoredFields > 0) {
      trackAnalytics('contact_form_draft_restored', { restored_fields: restoredFields });
    }
  }

  const trackedInputs = [emailInput, cityInput, zipInput, useCaseInput, teamSizeInput, goalInput]
    .filter((node): node is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => node !== null);
  trackedInputs.forEach((node) => {
    const sync = (): void => {
      writeDraft();
      applyRoutingPreview();
      if (nextAction) nextAction.hidden = true;
    };
    node.addEventListener('input', sync);
    node.addEventListener('change', sync);
  });

  applyRoutingPreview();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      email: String(formData.get('email') || '').trim(),
      city: String(formData.get('city') || '').trim() || undefined,
      zip_code: String(formData.get('zip_code') || '').trim() || undefined,
      use_case: normalizeIntakeUseCase(String(formData.get('use_case') || '').trim()) ?? undefined,
      team_size: normalizeIntakeTeamSize(String(formData.get('team_size') || '').trim()) ?? undefined,
      goal: String(formData.get('goal') || '').trim() || undefined,
    };

    if (!payload.email) {
      setStatus(status, 'Please enter your email address.', 'warning');
      return;
    }

    const routing = resolveRoutingContext();
    trackAnalytics('waitlist_submit_attempted', {
      surface: 'contact',
      route: routing.route,
      submit_label: routing.submitLabel,
      ...(routing.useCase ? { use_case: routing.useCase } : {}),
      ...(routing.teamSize ? { team_size: routing.teamSize } : {}),
    });

    setStatus(status, 'Submitting...', 'loading');
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const fallbackRoute = resolveWaitlistFollowUpRoute({
          use_case: payload.use_case,
          team_size: payload.team_size,
          goal: payload.goal,
        });

        let route = fallbackRoute;
        try {
          const data = await response.json() as unknown;
          if (data && typeof data === 'object' && 'follow_up' in data && (data as {
            follow_up?: { route?: unknown };
          }).follow_up) {
            route = normalizeRoute((data as { follow_up: { route?: unknown } }).follow_up.route);
          }
        } catch {
          // Best effort route extraction.
        }

        const routeAction = resolveWaitlistRouteAction(route);
        trackAnalytics('waitlist_submit_succeeded', {
          surface: 'contact',
          route,
          submit_label: routing.submitLabel,
          ...(routing.useCase ? { use_case: routing.useCase } : {}),
          ...(routing.teamSize ? { team_size: routing.teamSize } : {}),
        });

        markContactSubmittedProgress();

        if (nextAction) {
          nextAction.setAttribute('href', routeAction.routeHref);
          nextAction.textContent = routeAction.routeLabel;
          nextAction.hidden = false;
        }
        setStatus(status, `Thanks. You are on the waitlist.${routeAction.routeMessage}`, 'success');
        clearDraft();
        form.reset();
        applyRoutingPreview();
        if (routePreview) routePreview.textContent = resolveWaitlistRoutePreviewText(route);
        renderRoutePlan(route);
        return;
      }

      let message = 'Unable to submit right now. Please try again.';
      try {
        const data = await response.json() as unknown;
        if (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string') {
          message = (data as { error: string }).error;
        }
      } catch {
        // Keep default error message.
      }
      setStatus(status, message, 'error');
    } catch {
      setStatus(status, 'Network error. Please try again.', 'error');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', initContactPage);
