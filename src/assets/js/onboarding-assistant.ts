import type { IntakeTeamSize, IntakeUseCase } from './intake-routing';

type Borough = 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
type Category = 'music' | 'food' | 'arts' | 'networking' | 'family' | 'wellness';
type NeighborhoodVibe = 'creative' | 'family' | 'foodie' | 'professional' | 'quiet' | 'nightlife' | 'wellness';

type SmartSearchFilters = {
  borough?: Borough;
  category?: Category;
  max_price?: number;
  starts_before_hour?: number;
  within_walk_minutes?: number;
};

type OnboardingRole = 'consumer' | 'marketer' | 'business';
type OnboardingTeamSize = IntakeTeamSize;

type OnboardingProfile = {
  role: OnboardingRole;
  city?: string;
  borough?: Borough;
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

type SmartSearchLastRequest = {
  query: string;
  filters: SmartSearchFilters;
  commute_profile?: {
    home_borough?: Borough;
    work_borough?: Borough;
    profile_anchor?: 'home' | 'work' | 'balanced';
  };
  neighborhood_profile?: {
    preferred_vibe?: NeighborhoodVibe;
    crowd_tolerance?: 'low' | 'medium' | 'high';
    budget_preference?: 'free' | 'value' | 'premium';
  };
  created_at: string;
};

type TrackEventPayload = {
  event_name: 'onboarding_defaults_applied';
  properties: {
    role: OnboardingRole;
    apply_mode: 'manual' | 'quick_pack';
    auto_alert_enabled: boolean;
    autofill_lead_enabled: boolean;
  } & Record<string, unknown>;
  session_id?: string;
};

type InitOnboardingAssistantOptions = {
  readOnboardingPreferences: () => OnboardingPreferences;
  writeOnboardingPreferences: (preferences: OnboardingPreferences) => void;
  readOnboardingProfile: () => OnboardingProfile | null;
  writeOnboardingProfile: (profile: OnboardingProfile) => void;
  resolveOnboardingSearchDefaults: (
    role: OnboardingRole,
    borough?: Borough,
  ) => {
    query: string;
    category?: Category;
    max_price?: number;
    starts_before_hour?: number;
    within_walk_minutes?: number;
    borough?: Borough;
  };
  writeLastSmartSearchRequest: (input: SmartSearchLastRequest) => void;
  rememberRecentSmartSearchQuery: (query: string) => unknown;
  isSavedSearchAlertsEnabled: () => boolean;
  buildOnboardingAlertFingerprint: (
    role: OnboardingRole,
    request: SmartSearchLastRequest,
  ) => string;
  readOnboardingAutoAlertState: () => OnboardingAutoAlertState | null;
  writeOnboardingAutoAlertState: (state: OnboardingAutoAlertState) => void;
  saveSearchAlert: (payload: {
    query_text: string;
    filters?: {
      borough?: Borough;
      category?: Category;
    };
    session_id?: string;
  }) => Promise<{ success: true; id: number } | null>;
  sessionId: string;
  trackEvent: (payload: TrackEventPayload) => Promise<void> | void;
  normalizeLeadUseCase: (value: string | null | undefined) => IntakeUseCase | undefined;
};

export function initOnboardingAssistantController(options: InitOnboardingAssistantOptions): void {
  const assistant = document.getElementById('onboarding-assistant') as HTMLElement | null;
  if (!assistant) return;

  const roleButtons = Array.from(assistant.querySelectorAll<HTMLButtonElement>('.onboarding-role-btn[data-onboarding-role]'));
  const cityInput = document.getElementById('onboarding-city') as HTMLInputElement | null;
  const boroughSelect = document.getElementById('onboarding-borough') as HTMLSelectElement | null;
  const teamSizeSelect = document.getElementById('onboarding-team-size') as HTMLSelectElement | null;
  const applyButton = document.getElementById('onboarding-apply-defaults') as HTMLButtonElement | null;
  const status = document.getElementById('onboarding-status') as HTMLElement | null;
  const smartSearchSection = document.getElementById('smart-search') as HTMLElement | null;
  const smartSearchForm = document.getElementById('smart-search-form') as HTMLFormElement | null;
  const queryInput = document.getElementById('smart-search-query') as HTMLInputElement | null;
  const smartSearchBorough = document.getElementById('smart-search-borough') as HTMLSelectElement | null;
  const smartSearchCategory = document.getElementById('smart-search-category') as HTMLSelectElement | null;
  const smartSearchMaxPrice = document.getElementById('smart-search-max-price') as HTMLInputElement | null;
  const smartSearchStartsBefore = document.getElementById('smart-search-starts-before-hour') as HTMLInputElement | null;
  const smartSearchWalkMinutes = document.getElementById('smart-search-within-walk-minutes') as HTMLInputElement | null;
  const smartSearchHomeBorough = document.getElementById('smart-search-home-borough') as HTMLSelectElement | null;
  const instantApplyToggle = document.getElementById('onboarding-instant-apply') as HTMLInputElement | null;
  const autoAlertToggle = document.getElementById('onboarding-auto-alert') as HTMLInputElement | null;
  const autofillLeadToggle = document.getElementById('onboarding-autofill-lead') as HTMLInputElement | null;
  const pricingConsumerTab = document.querySelector<HTMLButtonElement>('.pricing-tab-btn[data-tab="consumer"]');
  const pricingBusinessTab = document.querySelector<HTMLButtonElement>('.pricing-tab-btn[data-tab="business"]');

  let selectedRole: OnboardingRole | null = null;
  let pendingApplyMode: 'manual' | 'quick_pack' = 'manual';
  const initialPreferences = options.readOnboardingPreferences();
  if (instantApplyToggle) instantApplyToggle.checked = true;
  if (autoAlertToggle) autoAlertToggle.checked = initialPreferences.auto_alert_enabled;
  if (autofillLeadToggle) autofillLeadToggle.checked = initialPreferences.autofill_lead_enabled;

  const renderRoleButtons = (): void => {
    for (const button of roleButtons) {
      const role = button.dataset.onboardingRole;
      button.classList.toggle('is-active', selectedRole !== null && role === selectedRole);
    }
  };

  const applyStoredProfileToAssistant = (profile: OnboardingProfile): void => {
    selectedRole = profile.role;
    if (cityInput) cityInput.value = profile.city ?? '';
    if (boroughSelect) boroughSelect.value = profile.borough ?? '';
    if (teamSizeSelect) teamSizeSelect.value = profile.team_size ?? '';
    renderRoleButtons();
  };

  const assignSmartSearchDefaults = (role: OnboardingRole): SmartSearchLastRequest | null => {
    if (!queryInput) return null;

    const borough = (boroughSelect?.value || undefined) as Borough | undefined;
    const defaults = options.resolveOnboardingSearchDefaults(role, borough);
    queryInput.value = defaults.query;
    if (smartSearchCategory) smartSearchCategory.value = defaults.category ?? '';
    if (smartSearchBorough) smartSearchBorough.value = defaults.borough ?? '';
    if (smartSearchMaxPrice) smartSearchMaxPrice.value = typeof defaults.max_price === 'number' ? String(defaults.max_price) : '';
    if (smartSearchStartsBefore) smartSearchStartsBefore.value = typeof defaults.starts_before_hour === 'number'
      ? String(defaults.starts_before_hour)
      : '';
    if (smartSearchWalkMinutes) smartSearchWalkMinutes.value = typeof defaults.within_walk_minutes === 'number'
      ? String(defaults.within_walk_minutes)
      : '';
    if (smartSearchHomeBorough) smartSearchHomeBorough.value = defaults.borough ?? '';

    return {
      query: defaults.query,
      filters: {
        ...(defaults.borough ? { borough: defaults.borough } : {}),
        ...(defaults.category ? { category: defaults.category } : {}),
        ...(typeof defaults.max_price === 'number' ? { max_price: defaults.max_price } : {}),
        ...(typeof defaults.starts_before_hour === 'number' ? { starts_before_hour: defaults.starts_before_hour } : {}),
        ...(typeof defaults.within_walk_minutes === 'number'
          ? { within_walk_minutes: defaults.within_walk_minutes }
          : {}),
      },
      commute_profile: {
        ...(defaults.borough ? { home_borough: defaults.borough } : {}),
        profile_anchor: 'balanced',
      },
      neighborhood_profile: {},
      created_at: new Date().toISOString(),
    };
  };

  const seedRoleSpecificInputDefaults = (role: OnboardingRole): void => {
    if (!teamSizeSelect || teamSizeSelect.value) return;
    if (role === 'consumer') {
      teamSizeSelect.value = 'solo';
      return;
    }
    teamSizeSelect.value = 'small_2_10';
  };

  const resolveEntryRecommendedRole = (): OnboardingRole | null => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'consumer' || roleParam === 'marketer' || roleParam === 'business') {
      return roleParam;
    }
    const useCaseParam = options.normalizeLeadUseCase(params.get('use_case'));
    if (useCaseParam === 'marketing_analytics') return 'marketer';
    if (useCaseParam === 'business_listing' || useCaseParam === 'agency_partnership') return 'business';
    if (useCaseParam === 'consumer_discovery') return 'consumer';

    const goalParam = (params.get('goal') ?? '').toLowerCase();
    if (/\b(seo|ctr|ranking|marketing|conversion)\b/.test(goalParam)) return 'marketer';
    if (/\b(listing|venue|booking|partnership|agency)\b/.test(goalParam)) return 'business';

    const referrer = document.referrer;
    if (!referrer) return null;
    try {
      const ref = new URL(referrer);
      const refPath = ref.pathname.toLowerCase();
      if (refPath.includes('/analytics') || refPath.includes('/blog/google-event-seo') || refPath.includes('/blog/llm-search-content')) {
        return 'marketer';
      }
      if (refPath.includes('/partnership')) {
        return 'business';
      }
      if (refPath.includes('/blog/local-event-discovery')) {
        return 'consumer';
      }
    } catch {
      return null;
    }
    return null;
  };

  for (const button of roleButtons) {
    button.addEventListener('click', () => {
      const role = button.dataset.onboardingRole;
      if (role === 'consumer' || role === 'marketer' || role === 'business') {
        selectedRole = role;
        seedRoleSpecificInputDefaults(role);
        renderRoleButtons();
        if (instantApplyToggle?.checked && applyButton && !applyButton.disabled) {
          pendingApplyMode = 'quick_pack';
          applyButton.click();
        }
      }
    });
  }

  const persistPreferenceDraft = (): void => {
    options.writeOnboardingPreferences({
      auto_alert_enabled: Boolean(autoAlertToggle?.checked ?? true),
      autofill_lead_enabled: Boolean(autofillLeadToggle?.checked ?? true),
      updated_at: new Date().toISOString(),
    });
    window.dispatchEvent(new Event('localgems:onboarding-updated'));
  };
  autoAlertToggle?.addEventListener('change', persistPreferenceDraft);
  autofillLeadToggle?.addEventListener('change', persistPreferenceDraft);

  applyButton?.addEventListener('click', async () => {
    if (!selectedRole) {
      if (status) status.textContent = 'Choose a role first to apply defaults.';
      return;
    }
    const applyRole = selectedRole;
    const applyMode = pendingApplyMode;
    pendingApplyMode = 'manual';

    const nowIso = new Date().toISOString();
    const nextPreferences: OnboardingPreferences = {
      auto_alert_enabled: Boolean(autoAlertToggle?.checked ?? true),
      autofill_lead_enabled: Boolean(autofillLeadToggle?.checked ?? true),
      updated_at: nowIso,
    };
    options.writeOnboardingPreferences(nextPreferences);

    if (status) status.textContent = 'Applying setup defaults...';
    if (applyButton) applyButton.disabled = true;
    try {
      const profile: OnboardingProfile = {
        role: applyRole,
        ...(cityInput?.value.trim() ? { city: cityInput.value.trim() } : {}),
        ...(boroughSelect?.value ? { borough: boroughSelect.value as Borough } : {}),
        ...(teamSizeSelect?.value ? { team_size: teamSizeSelect.value as OnboardingTeamSize } : {}),
        updated_at: nowIso,
      };
      options.writeOnboardingProfile(profile);
      window.dispatchEvent(new Event('localgems:onboarding-updated'));

      const lastRequest = assignSmartSearchDefaults(applyRole);
      if (lastRequest) {
        options.writeLastSmartSearchRequest(lastRequest);
        options.rememberRecentSmartSearchQuery(lastRequest.query);
      }

      let autoAlertMessage = '';
      const alertsEnabled = options.isSavedSearchAlertsEnabled();
      if (alertsEnabled && nextPreferences.auto_alert_enabled && lastRequest) {
        const fingerprint = options.buildOnboardingAlertFingerprint(applyRole, lastRequest);
        const previous = options.readOnboardingAutoAlertState();
        const previousTime = previous ? new Date(previous.created_at).getTime() : 0;
        const isFresh = previous && Number.isFinite(previousTime) && Date.now() - previousTime < 14 * 24 * 60 * 60 * 1000;
        const shouldCreate = !(previous && previous.fingerprint === fingerprint && isFresh);

        if (shouldCreate) {
          const saved = await options.saveSearchAlert({
            query_text: lastRequest.query,
            filters: {
              ...(lastRequest.filters.borough ? { borough: lastRequest.filters.borough } : {}),
              ...(lastRequest.filters.category ? { category: lastRequest.filters.category } : {}),
            },
            session_id: options.sessionId || undefined,
          });
          if (saved) {
            options.writeOnboardingAutoAlertState({
              fingerprint,
              saved_search_id: saved.id,
              created_at: nowIso,
            });
            autoAlertMessage = ' Default alert enabled.';
          } else {
            autoAlertMessage = ' Alert setup could not be completed.';
          }
        } else {
          autoAlertMessage = ' Existing default alert is already active.';
        }
      } else if (nextPreferences.auto_alert_enabled && !alertsEnabled) {
        autoAlertMessage = ' Alert automation is not enabled in this environment.';
      }

      if (applyRole === 'consumer') {
        pricingConsumerTab?.click();
      } else {
        pricingBusinessTab?.click();
      }

      void options.trackEvent({
        event_name: 'onboarding_defaults_applied',
        properties: {
          role: applyRole,
          apply_mode: applyMode,
          auto_alert_enabled: nextPreferences.auto_alert_enabled,
          autofill_lead_enabled: nextPreferences.autofill_lead_enabled,
        },
      });

      if (status) {
        status.textContent = `Defaults applied for ${applyRole}.${autoAlertMessage}`;
      }

      if (smartSearchSection) {
        smartSearchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (smartSearchForm && !smartSearchSection?.hidden) {
        smartSearchForm.requestSubmit();
      }
    } finally {
      if (applyButton) applyButton.disabled = false;
    }
  });

  const stored = options.readOnboardingProfile();
  if (stored) {
    applyStoredProfileToAssistant(stored);
    if (status) {
      status.textContent = `Welcome back. ${stored.role} defaults are ready.`;
    }
  } else {
    const recommendedRole = resolveEntryRecommendedRole();
    if (recommendedRole) {
      selectedRole = recommendedRole;
      seedRoleSpecificInputDefaults(recommendedRole);
      renderRoleButtons();
      if (status) {
        status.textContent = `Recommended quick pack selected: ${recommendedRole}.`;
      }
      if (instantApplyToggle?.checked && applyButton && !applyButton.disabled) {
        pendingApplyMode = 'quick_pack';
        applyButton.click();
      }
      return;
    }
    renderRoleButtons();
  }
}
