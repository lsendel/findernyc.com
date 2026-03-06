import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeIntakeTeamSize,
  normalizeIntakeUseCase,
  resolveWaitlistRouteAction,
  type IntakeTeamSize,
  type IntakeUseCase,
  type WaitlistFollowUpRoute,
} from '../../src/assets/js/intake-routing';
import { initJourneyProgressController } from '../../src/assets/js/journey-progress';
import { initLeadCaptureFormController } from '../../src/assets/js/lead-capture-form';
import { initOnboardingAssistantController } from '../../src/assets/js/onboarding-assistant';

const originalScrollIntoView = Element.prototype.scrollIntoView;

type OnboardingRole = 'consumer' | 'marketer' | 'business';
type Borough = 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';

function renderLandingFlowDom(): void {
  document.body.innerHTML = `
    <section id="onboarding-assistant">
      <button class="onboarding-role-btn" data-onboarding-role="consumer" type="button">Consumer</button>
      <button class="onboarding-role-btn" data-onboarding-role="marketer" type="button">Marketer</button>
      <button class="onboarding-role-btn" data-onboarding-role="business" type="button">Business</button>
    </section>
    <input id="onboarding-city" />
    <select id="onboarding-borough">
      <option value=""></option>
      <option value="manhattan">Manhattan</option>
    </select>
    <select id="onboarding-team-size">
      <option value=""></option>
      <option value="solo">Solo</option>
      <option value="small_2_10">2-10</option>
      <option value="mid_11_50">11-50</option>
      <option value="enterprise_50_plus">50+</option>
    </select>
    <button id="onboarding-apply-defaults" type="button">Apply</button>
    <p id="onboarding-status"></p>

    <section id="smart-search" hidden></section>
    <form id="smart-search-form"></form>
    <input id="smart-search-query" />
    <select id="smart-search-borough"><option value=""></option><option value="manhattan">Manhattan</option></select>
    <select id="smart-search-category"><option value=""></option><option value="networking">Networking</option></select>
    <input id="smart-search-max-price" />
    <input id="smart-search-starts-before-hour" />
    <input id="smart-search-within-walk-minutes" />
    <select id="smart-search-home-borough"><option value=""></option><option value="manhattan">Manhattan</option></select>

    <input id="onboarding-instant-apply" type="checkbox" />
    <input id="onboarding-auto-alert" type="checkbox" />
    <input id="onboarding-autofill-lead" type="checkbox" />

    <button class="pricing-tab-btn" data-tab="consumer" type="button">Consumer Pricing</button>
    <button class="pricing-tab-btn" data-tab="business" type="button">Business Pricing</button>

    <section id="journey-progress">
      <ul id="journey-progress-list"></ul>
      <a id="journey-progress-cta" hidden href="/"></a>
    </section>

    <form id="lead-capture-form">
      <input id="lead-email" type="email" />
      <select id="lead-use-case">
        <option value=""></option>
        <option value="consumer_discovery">Consumer</option>
        <option value="business_listing">Business</option>
        <option value="marketing_analytics">Marketing</option>
        <option value="agency_partnership">Partnership</option>
      </select>
      <select id="lead-team-size">
        <option value=""></option>
        <option value="solo">Solo</option>
        <option value="small_2_10">2-10</option>
        <option value="mid_11_50">11-50</option>
        <option value="enterprise_50_plus">50+</option>
      </select>
      <input id="lead-city" type="text" />
      <p id="lead-route-preview"></p>
      <p id="lead-profile-summary"></p>
      <a id="lead-next-action" href="/" hidden>Next</a>
      <p id="lead-capture-status"></p>
      <button id="lead-submit-button" type="submit">Join</button>
    </form>
  `;
}

function resolveLeadUseCaseFromRole(role: OnboardingRole): IntakeUseCase {
  if (role === 'marketer') return 'marketing_analytics';
  if (role === 'business') return 'business_listing';
  return 'consumer_discovery';
}

function buildContactPrefillHref(input: {
  use_case?: IntakeUseCase;
  team_size?: IntakeTeamSize;
  city?: string;
  goal?: string;
}): string {
  const params = new URLSearchParams();
  if (input.use_case) params.set('use_case', input.use_case);
  if (input.team_size) params.set('team_size', input.team_size);
  if (input.city) params.set('city', input.city);
  if (input.goal) params.set('goal', input.goal);
  const query = params.toString();
  return query ? `/contact?${query}` : '/contact';
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  history.replaceState({}, '', '/');
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: originalScrollIntoView,
  });
});

describe('landing flow integration', () => {
  it('applies quick-pack defaults, advances journey CTA, and updates lead route preview', () => {
    renderLandingFlowDom();
    history.replaceState({}, '', '/?role=marketer');

    let onboardingProfile: {
      role: OnboardingRole;
      city?: string;
      borough?: Borough;
      team_size?: IntakeTeamSize;
      updated_at: string;
    } | null = null;
    let onboardingPreferences = {
      auto_alert_enabled: true,
      autofill_lead_enabled: true,
      updated_at: '2026-03-05T10:00:00.000Z',
    };
    let onboardingAutoAlertState: { fingerprint: string; saved_search_id?: number; created_at: string } | null = null;
    let journeyProgress: {
      search_completed_at?: string;
      alert_created_at?: string;
      lead_submitted_at?: string;
      contact_submitted_at?: string;
    } = {};

    const leadTrackEvent = vi.fn(async () => {});
    const onboardingTrackEvent = vi.fn(async () => {});
    const writeOnboardingProfile = vi.fn((profile: {
      role: OnboardingRole;
      city?: string;
      borough?: Borough;
      team_size?: IntakeTeamSize;
      updated_at: string;
    }) => {
      onboardingProfile = profile;
    });

    const markJourneyProgressStep = (step: 'search_completed_at' | 'alert_created_at' | 'lead_submitted_at'): void => {
      journeyProgress = {
        ...journeyProgress,
        [step]: new Date().toISOString(),
      };
      window.dispatchEvent(new Event('localgems:journey-update'));
    };

    initJourneyProgressController({
      readOnboardingProfile: () => onboardingProfile,
      readJourneyProgress: () => journeyProgress,
      readOnboardingAutoAlertState: () => onboardingAutoAlertState,
      resolveLeadUseCaseFromRole,
      buildContactPrefillHref: ({ use_case, team_size, city }) => buildContactPrefillHref({
        use_case,
        team_size,
        city,
      }),
    });

    initLeadCaptureFormController({
      readOnboardingPreferences: () => ({
        autofill_lead_enabled: onboardingPreferences.autofill_lead_enabled,
      }),
      readOnboardingProfile: () => onboardingProfile,
      resolveLeadUseCaseFromRole,
      normalizeLeadUseCase: normalizeIntakeUseCase,
      normalizeOnboardingTeamSize: normalizeIntakeTeamSize,
      titleCase: (value: string) => value.replaceAll('_', ' '),
      trackEvent: leadTrackEvent,
      trackCTA: vi.fn(),
      markJourneyProgressStep,
      resolveLeadNextAction: ({ use_case, team_size, city }) => ({
        label: 'Open Contact',
        href: buildContactPrefillHref({ use_case, team_size, city }),
      }),
      resolveLeadNextActionForRoute: (route, fallback) => {
        if (route === 'community_waitlist') {
          return {
            label: 'Open Contact',
            href: buildContactPrefillHref(fallback),
          };
        }
        const action = resolveWaitlistRouteAction(route);
        return { label: action.routeLabel, href: action.routeHref };
      },
    });

    initOnboardingAssistantController({
      readOnboardingPreferences: () => onboardingPreferences,
      writeOnboardingPreferences: (preferences) => {
        onboardingPreferences = preferences;
      },
      readOnboardingProfile: () => onboardingProfile,
      writeOnboardingProfile,
      resolveOnboardingSearchDefaults: () => ({
        query: 'local marketing networking events',
        category: 'networking',
        max_price: 120,
        starts_before_hour: 21,
        within_walk_minutes: 40,
        borough: 'manhattan',
      }),
      writeLastSmartSearchRequest: vi.fn(),
      rememberRecentSmartSearchQuery: vi.fn(),
      isSavedSearchAlertsEnabled: () => false,
      buildOnboardingAlertFingerprint: vi.fn(() => 'unused'),
      readOnboardingAutoAlertState: () => onboardingAutoAlertState,
      writeOnboardingAutoAlertState: (state) => {
        onboardingAutoAlertState = state;
      },
      saveSearchAlert: vi.fn(async () => ({ success: true as const, id: 999 })),
      sessionId: 'sess_test',
      trackEvent: onboardingTrackEvent,
      normalizeLeadUseCase: normalizeIntakeUseCase,
    });

    const leadRoutePreview = document.getElementById('lead-route-preview');
    const leadUseCase = document.getElementById('lead-use-case') as HTMLSelectElement;
    const journeyCta = document.getElementById('journey-progress-cta') as HTMLAnchorElement;

    expect(writeOnboardingProfile).toHaveBeenCalledWith(expect.objectContaining({ role: 'marketer' }));
    expect(leadUseCase.value).toBe('marketing_analytics');
    expect(leadRoutePreview?.textContent).toContain('Marketing consult track');
    expect(leadTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
      event_name: 'waitlist_route_preview_updated',
      properties: expect.objectContaining({
        surface: 'landing',
        route: 'marketing_consult' as WaitlistFollowUpRoute,
      }),
    }));
    expect(journeyCta.textContent).toBe('Run Smart Search');

    markJourneyProgressStep('search_completed_at');
    expect(journeyCta.textContent).toBe('Create Saved Alert');

    markJourneyProgressStep('alert_created_at');
    expect(journeyCta.textContent).toBe('Complete Intake');
    expect(journeyCta.getAttribute('href')).toContain('/contact?use_case=marketing_analytics');
  });
});
