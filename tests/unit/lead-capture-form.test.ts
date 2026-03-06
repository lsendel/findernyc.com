import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeIntakeTeamSize,
  normalizeIntakeUseCase,
  type IntakeUseCase,
  type WaitlistFollowUpRoute,
} from '../../src/assets/js/intake-routing';
import { initLeadCaptureFormController } from '../../src/assets/js/lead-capture-form';

type OnboardingRole = 'consumer' | 'marketer' | 'business';
type InitOptions = Parameters<typeof initLeadCaptureFormController>[0];

function renderLeadCaptureDom(): void {
  document.body.innerHTML = `
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

function createOptions(overrides: Partial<InitOptions> = {}): InitOptions {
  return {
    readOnboardingPreferences: () => ({
      autofill_lead_enabled: true,
    }),
    readOnboardingProfile: () => ({
      role: 'consumer',
      city: 'New York',
      team_size: 'solo',
    }),
    resolveLeadUseCaseFromRole: (role: OnboardingRole): IntakeUseCase => {
      if (role === 'marketer') return 'marketing_analytics';
      if (role === 'business') return 'business_listing';
      return 'consumer_discovery';
    },
    normalizeLeadUseCase: normalizeIntakeUseCase,
    normalizeOnboardingTeamSize: normalizeIntakeTeamSize,
    titleCase: (value: string) => value.replaceAll('_', ' '),
    trackEvent: vi.fn(async () => {}),
    trackCTA: vi.fn(),
    markJourneyProgressStep: vi.fn(),
    resolveLeadNextAction: vi.fn(() => ({
      label: 'Open Contact',
      href: '/contact',
    })),
    resolveLeadNextActionForRoute: vi.fn(() => ({
      label: 'Route Action',
      href: '/route-action',
    })),
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
  history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});

describe('lead capture controller', () => {
  it('derives next action from server follow_up.route on successful submit', async () => {
    renderLeadCaptureDom();

    const fetchMock = vi.fn(async () => ({
      status: 201,
      json: async () => ({
        follow_up: {
          route: 'sales_demo',
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const options = createOptions();
    initLeadCaptureFormController(options);

    const emailInput = document.getElementById('lead-email') as HTMLInputElement;
    const useCaseSelect = document.getElementById('lead-use-case') as HTMLSelectElement;
    const teamSizeSelect = document.getElementById('lead-team-size') as HTMLSelectElement;
    const cityInput = document.getElementById('lead-city') as HTMLInputElement;
    const form = document.getElementById('lead-capture-form') as HTMLFormElement;
    const nextAction = document.getElementById('lead-next-action') as HTMLAnchorElement;
    const status = document.getElementById('lead-capture-status') as HTMLElement;

    emailInput.value = 'marketer@example.com';
    useCaseSelect.value = 'marketing_analytics';
    teamSizeSelect.value = 'mid_11_50';
    cityInput.value = 'Brooklyn';

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(options.markJourneyProgressStep).toHaveBeenCalledWith('lead_submitted_at');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(options.resolveLeadNextAction).not.toHaveBeenCalled();
    expect(options.resolveLeadNextActionForRoute).toHaveBeenCalledWith('sales_demo' as WaitlistFollowUpRoute, {
      use_case: 'marketing_analytics',
      team_size: 'mid_11_50',
      city: 'Brooklyn',
    });
    expect(nextAction.hidden).toBe(false);
    expect(nextAction.textContent).toBe('Route Action');
    expect(nextAction.getAttribute('href')).toBe('/route-action');
    expect(options.markJourneyProgressStep).toHaveBeenCalledWith('lead_submitted_at');
    expect(status.textContent).toBe('Thanks. You are on the waitlist. Continue with the next step below.');
    expect(options.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      event_name: 'waitlist_submit_succeeded',
      properties: expect.objectContaining({
        route: 'sales_demo',
        submit_label: 'Request Marketing Consult',
      }),
    }));
  });
});
