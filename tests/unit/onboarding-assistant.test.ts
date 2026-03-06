import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeIntakeUseCase } from '../../src/assets/js/intake-routing';
import { initOnboardingAssistantController } from '../../src/assets/js/onboarding-assistant';

type InitOptions = Parameters<typeof initOnboardingAssistantController>[0];
const originalScrollIntoView = Element.prototype.scrollIntoView;

function renderOnboardingDom(): void {
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
    <select id="smart-search-borough">
      <option value=""></option>
      <option value="manhattan">Manhattan</option>
    </select>
    <select id="smart-search-category">
      <option value=""></option>
      <option value="music">Music</option>
      <option value="networking">Networking</option>
    </select>
    <input id="smart-search-max-price" />
    <input id="smart-search-starts-before-hour" />
    <input id="smart-search-within-walk-minutes" />
    <select id="smart-search-home-borough">
      <option value=""></option>
      <option value="manhattan">Manhattan</option>
    </select>

    <input id="onboarding-instant-apply" type="checkbox" />
    <input id="onboarding-auto-alert" type="checkbox" />
    <input id="onboarding-autofill-lead" type="checkbox" />

    <button class="pricing-tab-btn" data-tab="consumer" type="button">Consumer Pricing</button>
    <button class="pricing-tab-btn" data-tab="business" type="button">Business Pricing</button>
  `;
}

function createOptions(overrides: Partial<InitOptions> = {}): InitOptions {
  return {
    readOnboardingPreferences: () => ({
      auto_alert_enabled: true,
      autofill_lead_enabled: true,
      updated_at: '2026-03-05T12:00:00.000Z',
    }),
    writeOnboardingPreferences: vi.fn(),
    readOnboardingProfile: () => null,
    writeOnboardingProfile: vi.fn(),
    resolveOnboardingSearchDefaults: () => ({
      query: 'default query',
      category: 'music',
      max_price: 40,
      starts_before_hour: 22,
      within_walk_minutes: 20,
      borough: 'manhattan',
    }),
    writeLastSmartSearchRequest: vi.fn(),
    rememberRecentSmartSearchQuery: vi.fn(),
    isSavedSearchAlertsEnabled: () => false,
    buildOnboardingAlertFingerprint: vi.fn(() => 'default-fingerprint'),
    readOnboardingAutoAlertState: () => null,
    writeOnboardingAutoAlertState: vi.fn(),
    saveSearchAlert: vi.fn(async () => ({ success: true as const, id: 123 })),
    sessionId: 'sess_test',
    trackEvent: vi.fn(async () => {}),
    normalizeLeadUseCase: normalizeIntakeUseCase,
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
  history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: originalScrollIntoView,
  });
});

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

describe('onboarding assistant controller', () => {
  it('auto-applies recommended role via quick-pack mode', async () => {
    renderOnboardingDom();
    history.replaceState({}, '', '/?use_case=marketing_analytics');
    const options = createOptions({ isSavedSearchAlertsEnabled: () => false });

    initOnboardingAssistantController(options);
    await Promise.resolve();

    expect(options.writeOnboardingProfile).toHaveBeenCalledTimes(1);
    expect(options.writeOnboardingProfile).toHaveBeenCalledWith(expect.objectContaining({
      role: 'marketer',
      team_size: 'small_2_10',
    }));
    expect(options.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      event_name: 'onboarding_defaults_applied',
      properties: expect.objectContaining({
        role: 'marketer',
        apply_mode: 'quick_pack',
      }),
    }));
    expect(document.getElementById('onboarding-status')?.textContent).toContain('Defaults applied for marketer');
  });

  it('skips alert creation when matching recent auto-alert fingerprint exists', async () => {
    renderOnboardingDom();
    const saveSearchAlert = vi.fn(async () => ({ success: true as const, id: 999 }));
    const options = createOptions({
      isSavedSearchAlertsEnabled: () => true,
      buildOnboardingAlertFingerprint: vi.fn(() => 'same-fingerprint'),
      readOnboardingAutoAlertState: () => ({
        fingerprint: 'same-fingerprint',
        saved_search_id: 777,
        created_at: new Date().toISOString(),
      }),
      saveSearchAlert,
    });

    initOnboardingAssistantController(options);
    const consumerButton = document.querySelector<HTMLButtonElement>('.onboarding-role-btn[data-onboarding-role="consumer"]');
    expect(consumerButton).not.toBeNull();
    consumerButton!.click();
    await Promise.resolve();

    expect(saveSearchAlert).not.toHaveBeenCalled();
    expect(options.writeOnboardingAutoAlertState).not.toHaveBeenCalled();
    expect(document.getElementById('onboarding-status')?.textContent).toContain('Existing default alert is already active.');
  });

  it('persists onboarding preference toggle changes and emits update events', () => {
    renderOnboardingDom();
    const writeOnboardingPreferences = vi.fn();
    const options = createOptions({ writeOnboardingPreferences });
    const updateListener = vi.fn();
    window.addEventListener('localgems:onboarding-updated', updateListener);

    initOnboardingAssistantController(options);

    const autoAlertToggle = document.getElementById('onboarding-auto-alert') as HTMLInputElement;
    const autofillLeadToggle = document.getElementById('onboarding-autofill-lead') as HTMLInputElement;

    autoAlertToggle.checked = false;
    autoAlertToggle.dispatchEvent(new Event('change'));
    autofillLeadToggle.checked = false;
    autofillLeadToggle.dispatchEvent(new Event('change'));

    expect(writeOnboardingPreferences).toHaveBeenCalledTimes(2);
    expect(writeOnboardingPreferences.mock.calls[0][0]).toEqual(expect.objectContaining({
      auto_alert_enabled: false,
      autofill_lead_enabled: true,
    }));
    expect(writeOnboardingPreferences.mock.calls[1][0]).toEqual(expect.objectContaining({
      auto_alert_enabled: false,
      autofill_lead_enabled: false,
    }));
    expect(updateListener).toHaveBeenCalledTimes(2);

    window.removeEventListener('localgems:onboarding-updated', updateListener);
  });
});
