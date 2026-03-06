import {
  normalizeWaitlistFollowUpRoute,
  resolveWaitlistFollowUpRoute,
  resolveWaitlistRoutePreviewText,
  resolveWaitlistSubmitLabel,
  type IntakeTeamSize,
  type IntakeUseCase,
  type WaitlistFollowUpRoute,
} from './intake-routing';
import { setStatusState } from './ui-states';

type OnboardingRole = 'consumer' | 'marketer' | 'business';

type OnboardingProfile = {
  role: OnboardingRole;
  city?: string;
  borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
  team_size?: IntakeTeamSize;
};

type OnboardingPreferences = {
  autofill_lead_enabled: boolean;
};

type WaitlistTrackEventName =
  | 'waitlist_route_preview_updated'
  | 'waitlist_submit_attempted'
  | 'waitlist_submit_succeeded';

type WaitlistTrackEventProperties = {
  surface: 'landing';
  route: WaitlistFollowUpRoute;
  submit_label: string;
  use_case?: IntakeUseCase;
  team_size?: IntakeTeamSize;
} & Record<string, unknown>;

type WaitlistTrackEventPayload = {
  event_name: WaitlistTrackEventName;
  properties: WaitlistTrackEventProperties;
  session_id?: string;
};

type LeadNextActionInput = {
  use_case?: IntakeUseCase;
  team_size?: IntakeTeamSize;
  city?: string;
};

type InitLeadCaptureFormOptions = {
  readOnboardingPreferences: () => OnboardingPreferences;
  readOnboardingProfile: () => OnboardingProfile | null;
  resolveLeadUseCaseFromRole: (role: OnboardingRole) => IntakeUseCase;
  normalizeLeadUseCase: (value: string | null | undefined) => IntakeUseCase | undefined;
  normalizeOnboardingTeamSize: (value: string | null | undefined) => IntakeTeamSize | undefined;
  titleCase: (value: string) => string;
  trackEvent: (payload: WaitlistTrackEventPayload) => Promise<void> | void;
  trackCTA: (label: string, section: string) => void;
  markJourneyProgressStep: (step: 'lead_submitted_at') => void;
  resolveLeadNextAction: (input: LeadNextActionInput) => { label: string; href: string };
  resolveLeadNextActionForRoute: (
    route: WaitlistFollowUpRoute,
    fallback: LeadNextActionInput,
  ) => { label: string; href: string };
};

export function initLeadCaptureFormController(options: InitLeadCaptureFormOptions): void {
  const form = document.getElementById('lead-capture-form') as HTMLFormElement | null;
  const emailInput = document.getElementById('lead-email') as HTMLInputElement | null;
  const useCaseSelect = document.getElementById('lead-use-case') as HTMLSelectElement | null;
  const teamSizeSelect = document.getElementById('lead-team-size') as HTMLSelectElement | null;
  const cityInput = document.getElementById('lead-city') as HTMLInputElement | null;
  const routePreview = document.getElementById('lead-route-preview') as HTMLElement | null;
  const profileSummary = document.getElementById('lead-profile-summary') as HTMLElement | null;
  const nextAction = document.getElementById('lead-next-action') as HTMLAnchorElement | null;
  const status = document.getElementById('lead-capture-status') as HTMLElement | null;
  const submitBtn = document.getElementById('lead-submit-button') as HTMLButtonElement | null;
  let lastRoutePreviewFingerprint = '';
  const successMessage = 'Thanks. You are on the waitlist. Continue with the next step below.';

  if (!form || !emailInput || !status) return;

  const updateSummary = (): void => {
    if (!profileSummary) return;
    const preferences = options.readOnboardingPreferences();
    const profile = options.readOnboardingProfile();
    if (!profile || !preferences.autofill_lead_enabled) {
      profileSummary.textContent = 'Setup profile is not active. Complete the assistant above to prefill this form.';
      return;
    }

    const roleLabel =
      profile.role === 'consumer'
        ? 'Event Discovery'
        : profile.role === 'marketer'
          ? 'Marketing'
          : 'Business Listings';
    const boroughLabel = profile.borough ? ` • ${options.titleCase(profile.borough)}` : '';
    const cityLabel = profile.city ? ` • ${profile.city}` : '';
    const teamLabel = profile.team_size ? ` • ${options.titleCase(profile.team_size)}` : '';
    profileSummary.textContent = `Setup profile active: ${roleLabel}${boroughLabel}${cityLabel}${teamLabel}`;
  };

  const applyOnboardingDefaults = (force = false): void => {
    const preferences = options.readOnboardingPreferences();
    const profile = options.readOnboardingProfile();
    if (!profile || !preferences.autofill_lead_enabled) {
      updateSummary();
      return;
    }

    if (useCaseSelect && (force || !useCaseSelect.value)) {
      useCaseSelect.value = options.resolveLeadUseCaseFromRole(profile.role);
    }
    if (teamSizeSelect && profile.team_size && (force || !teamSizeSelect.value)) {
      teamSizeSelect.value = profile.team_size;
    }
    if (cityInput && profile.city && (force || !cityInput.value)) {
      cityInput.value = profile.city;
    }
    updateSummary();
  };

  const applyUrlPrefill = (): void => {
    const params = new URLSearchParams(window.location.search);
    const urlUseCase = options.normalizeLeadUseCase(params.get('use_case'));
    const urlTeamSize = options.normalizeOnboardingTeamSize(params.get('team_size'));
    const urlCity = params.get('city')?.trim();
    if (useCaseSelect && urlUseCase) useCaseSelect.value = urlUseCase;
    if (teamSizeSelect && urlTeamSize) teamSizeSelect.value = urlTeamSize;
    if (cityInput && urlCity) cityInput.value = urlCity.slice(0, 100);
  };

  const resolveRoutingContext = (): {
    resolvedUseCase?: IntakeUseCase;
    resolvedTeamSize?: IntakeTeamSize;
    route: WaitlistFollowUpRoute;
    submitLabel: string;
    selectedCity?: string;
  } => {
    const onboardingPreferences = options.readOnboardingPreferences();
    const onboardingProfile = options.readOnboardingProfile();
    const selectedUseCase = options.normalizeLeadUseCase(useCaseSelect?.value);
    const selectedTeamSize = options.normalizeOnboardingTeamSize(teamSizeSelect?.value);
    const selectedCity = cityInput?.value.trim() || undefined;
    const fallbackUseCase = onboardingProfile ? options.resolveLeadUseCaseFromRole(onboardingProfile.role) : undefined;
    const resolvedUseCase = selectedUseCase
      ?? (onboardingPreferences.autofill_lead_enabled ? fallbackUseCase : undefined);
    const resolvedTeamSize = selectedTeamSize
      ?? (onboardingPreferences.autofill_lead_enabled ? onboardingProfile?.team_size : undefined);
    const route = resolveWaitlistFollowUpRoute({
      use_case: resolvedUseCase,
      team_size: resolvedTeamSize,
    });
    return {
      resolvedUseCase,
      resolvedTeamSize,
      route,
      submitLabel: resolveWaitlistSubmitLabel(route),
      selectedCity,
    };
  };

  const updateRoutingPreview = (input?: { preserveSuccessState?: boolean }): void => {
    const routing = resolveRoutingContext();
    if (routePreview) {
      routePreview.textContent = resolveWaitlistRoutePreviewText(routing.route);
    }
    if (submitBtn) {
      submitBtn.textContent = routing.submitLabel;
    }
    if (!input?.preserveSuccessState) {
      if (nextAction && !nextAction.hidden) {
        nextAction.hidden = true;
      }
      if (status.textContent === successMessage) {
        setStatusState(status, '', 'idle');
      }
    }
    if (routing.selectedCity && routePreview) {
      routePreview.textContent += ` City context: ${routing.selectedCity}.`;
    }
    const fingerprint = [
      'landing',
      routing.route,
      routing.submitLabel,
      routing.resolvedUseCase ?? '',
      routing.resolvedTeamSize ?? '',
    ].join('|');
    if (fingerprint !== lastRoutePreviewFingerprint) {
      lastRoutePreviewFingerprint = fingerprint;
      void options.trackEvent({
        event_name: 'waitlist_route_preview_updated',
        properties: {
          surface: 'landing',
          route: routing.route,
          submit_label: routing.submitLabel,
          ...(routing.resolvedUseCase ? { use_case: routing.resolvedUseCase } : {}),
          ...(routing.resolvedTeamSize ? { team_size: routing.resolvedTeamSize } : {}),
        },
      });
    }
  };

  applyOnboardingDefaults();
  applyUrlPrefill();
  updateSummary();
  updateRoutingPreview();

  useCaseSelect?.addEventListener('change', () => {
    updateSummary();
    updateRoutingPreview();
  });
  teamSizeSelect?.addEventListener('change', () => {
    updateSummary();
    updateRoutingPreview();
  });
  cityInput?.addEventListener('input', () => {
    updateSummary();
    updateRoutingPreview();
  });
  window.addEventListener('localgems:onboarding-updated', () => {
    applyOnboardingDefaults(true);
    updateSummary();
    updateRoutingPreview();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    if (!email) {
      setStatusState(status, 'Please enter your email address.', 'warning');
      return;
    }

    options.trackCTA('join-waitlist-sign-up', 'sign-up');
    setStatusState(status, 'Submitting...', 'loading');

    if (submitBtn) submitBtn.disabled = true;

    const onboardingPreferences = options.readOnboardingPreferences();
    const onboardingProfile = options.readOnboardingProfile();
    const leadUseCase = options.normalizeLeadUseCase(useCaseSelect?.value);
    const leadTeamSize = options.normalizeOnboardingTeamSize(teamSizeSelect?.value);
    const leadCity = cityInput?.value.trim();
    const profileUseCase = onboardingProfile ? options.resolveLeadUseCaseFromRole(onboardingProfile.role) : undefined;
    const routing = resolveRoutingContext();
    void options.trackEvent({
      event_name: 'waitlist_submit_attempted',
      properties: {
        surface: 'landing',
        route: routing.route,
        submit_label: routing.submitLabel,
        ...(routing.resolvedUseCase ? { use_case: routing.resolvedUseCase } : {}),
        ...(routing.resolvedTeamSize ? { team_size: routing.resolvedTeamSize } : {}),
      },
    });

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source_cta: 'join-waitlist-sign-up',
          source_section: 'sign-up',
          ...(leadUseCase ? { use_case: leadUseCase } : {}),
          ...(leadTeamSize ? { team_size: leadTeamSize } : {}),
          ...(leadCity ? { city: leadCity.slice(0, 100) } : {}),
          ...(onboardingProfile?.borough && onboardingPreferences.autofill_lead_enabled
            ? { borough: onboardingProfile.borough }
            : {}),
          ...(!leadUseCase && profileUseCase && onboardingPreferences.autofill_lead_enabled
            ? { use_case: profileUseCase }
            : {}),
          ...(!leadTeamSize && onboardingProfile?.team_size && onboardingPreferences.autofill_lead_enabled
            ? { team_size: onboardingProfile.team_size }
            : {}),
          ...(!leadCity && onboardingProfile?.city && onboardingPreferences.autofill_lead_enabled
            ? { city: onboardingProfile.city.slice(0, 100) }
            : {}),
        }),
      });

      if (response.status === 201) {
        let serverRoute: WaitlistFollowUpRoute | undefined;
        try {
          const data = await response.json() as unknown;
          if (
            data
            && typeof data === 'object'
            && 'follow_up' in data
            && (data as { follow_up?: unknown }).follow_up
            && typeof (data as { follow_up: { route?: unknown } }).follow_up === 'object'
          ) {
            serverRoute = normalizeWaitlistFollowUpRoute((data as {
              follow_up: { route?: unknown };
            }).follow_up.route);
          }
        } catch {
          // Best effort: fallback to local route resolution.
        }

        options.markJourneyProgressStep('lead_submitted_at');
        const resolvedUseCase = leadUseCase
          ?? (onboardingPreferences.autofill_lead_enabled ? profileUseCase : undefined);
        const resolvedTeamSize = leadTeamSize
          ?? (onboardingPreferences.autofill_lead_enabled ? onboardingProfile?.team_size : undefined);
        const resolvedCity = leadCity
          ?? (onboardingPreferences.autofill_lead_enabled ? onboardingProfile?.city : undefined);
        if (nextAction) {
          const fallback = {
            use_case: resolvedUseCase,
            team_size: resolvedTeamSize,
            city: resolvedCity,
          };
          const next = serverRoute
            ? options.resolveLeadNextActionForRoute(serverRoute, fallback)
            : options.resolveLeadNextAction(fallback);
          nextAction.href = next.href;
          nextAction.textContent = next.label;
          nextAction.hidden = false;
        }
        void options.trackEvent({
          event_name: 'waitlist_submit_succeeded',
          properties: {
            surface: 'landing',
            route: serverRoute ?? routing.route,
            submit_label: routing.submitLabel,
            ...(resolvedUseCase ? { use_case: resolvedUseCase } : {}),
            ...(resolvedTeamSize ? { team_size: resolvedTeamSize } : {}),
          },
        });
        setStatusState(status, successMessage, 'success');
        form.reset();
        applyOnboardingDefaults();
        applyUrlPrefill();
        updateSummary();
        updateRoutingPreview({ preserveSuccessState: true });
        return;
      }

      if (response.status === 409) {
        setStatusState(status, 'You are already on the waitlist.', 'warning');
        return;
      }

      let message = 'Unable to submit right now. Please try again.';
      try {
        const data = await response.json();
        if (data && typeof data.error === 'string') message = data.error;
      } catch {
        // Fall back to generic message when response is not JSON.
      }
      setStatusState(status, message, 'error');
    } catch {
      setStatusState(status, 'Network error. Please try again.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
