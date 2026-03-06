import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initMarketingSnapshotController } from '../../src/assets/js/marketing-snapshot-controller';

const originalScrollIntoView = Element.prototype.scrollIntoView;

function renderMarketingSnapshotDom(): void {
  document.body.innerHTML = `
    <section id="marketing-snapshot">
      <div id="marketing-snapshot-ctr"></div>
      <div id="marketing-snapshot-inquiry-rate"></div>
      <div id="marketing-snapshot-schedule-rate"></div>
      <div id="marketing-snapshot-ranking-opportunity"></div>
      <div id="marketing-snapshot-window"></div>
      <ul id="marketing-snapshot-top-events"></ul>
      <ul id="marketing-snapshot-actions"></ul>
      <ul id="marketing-snapshot-alerts"></ul>
      <ul id="marketing-snapshot-automations"></ul>
      <ul id="marketing-snapshot-tuning-rules"></ul>
      <ul id="marketing-snapshot-automation-state"></ul>
      <ul id="marketing-snapshot-playbook"></ul>
      <p id="marketing-snapshot-playbook-progress"></p>
      <ul id="marketing-snapshot-playbook-recovery"></ul>
      <ul id="marketing-snapshot-recovery-impact"></ul>
      <a id="marketing-snapshot-open-intake" href="/contact" hidden></a>
      <ul id="marketing-snapshot-waitlist-funnel"></ul>
      <p id="marketing-snapshot-status"></p>
      <button id="marketing-snapshot-refresh" type="button">Refresh</button>
      <input id="marketing-snapshot-auto-run-top" type="checkbox" checked>
      <input id="marketing-snapshot-auto-run-recovery" type="checkbox" checked>
      <input id="marketing-snapshot-auto-run-escalation" type="checkbox" checked>
      <select id="marketing-snapshot-escalation-cooldown-hours">
        <option value="6">6 hours</option>
        <option value="12">12 hours</option>
        <option value="24" selected>24 hours</option>
        <option value="48">48 hours</option>
      </select>
      <input id="marketing-snapshot-auto-apply-recommended" type="checkbox" checked>
      <button id="marketing-snapshot-pause-auto-run-6h" type="button">Pause 6h</button>
      <button id="marketing-snapshot-pause-auto-run-24h" type="button">Pause 24h</button>
      <button id="marketing-snapshot-resume-auto-run" type="button">Resume</button>
      <button id="marketing-snapshot-run-next-auto-action" type="button">Run Next</button>
      <button id="marketing-snapshot-clear-query-retry-auto" type="button">Clear Retry</button>
      <button id="marketing-snapshot-apply-tuning-rules-now" type="button">Apply Rules</button>
      <p id="marketing-snapshot-auto-run-pause-state"></p>
    </section>
    <section id="smart-search"></section>
    <form id="smart-search-form"></form>
    <input id="smart-search-query" />
    <input id="onboarding-instant-apply" type="checkbox" />
    <input id="onboarding-auto-alert" type="checkbox" />
    <input id="onboarding-autofill-lead" type="checkbox" />
    <input id="smart-search-auto-schedule" type="checkbox" />
  `;
}

function createPayload(overrides: Record<string, unknown> = {}): any {
  return {
    success: true,
    summary: { total_events: 12, window_days: 14 },
    weekly_playbook: { confidence: 'high' },
    automation_recommendations: [],
    automation_tuning_rules: [],
    recovery_escalation_actions: [],
    recovery_outcome_delta: {
      total_runs: 0,
      has_comparison: false,
      confidence: 'low',
      click_through_rate_delta: 0,
      inquiry_rate_delta: 0,
      schedule_rate_delta: 0,
    },
    playbook_recovery_recommendations: [],
    playbook_outcome_delta: {
      has_comparison: false,
      confidence: 'low',
    },
    recovery_escalation_attribution: {
      total_runs: 0,
      manual_runs: 0,
      auto_runs: 0,
      actions: [],
    },
    recommendations: [{ suggested_query: 'best rooftop events nyc' }],
    query_clusters: [],
    ...overrides,
  };
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: originalScrollIntoView,
  });
});

describe('marketing snapshot controller', () => {
  it('auto-runs top opportunity query when enabled and search input is empty', async () => {
    renderMarketingSnapshotDom();
    const form = document.getElementById('smart-search-form') as HTMLFormElement;
    const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {});
    const trackCTA = vi.fn();
    const setStatusState = vi.fn();

    initMarketingSnapshotController({
      preferences_storage_key: 'snapshot-prefs',
      readMarketingSnapshotPreferences: () => ({
        auto_run_top_opportunity: true,
        auto_run_recovery: true,
        auto_run_escalation: true,
        escalation_cooldown_hours: 24,
        auto_apply_recommended: true,
        auto_run_pause_until: null,
      }),
      writeMarketingSnapshotPreferences: vi.fn(),
      requestInsightsHub: vi.fn(async () => ({
        status: 200,
        body: createPayload(),
      })),
      renderMarketingSnapshotCards: vi.fn(),
      trackCTA,
      trackEvent: vi.fn(async () => {}),
      setStatusState,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const queryInput = document.getElementById('smart-search-query') as HTMLInputElement;
    expect(queryInput.value).toBe('best rooftop events nyc');
    expect(trackCTA).toHaveBeenCalledWith('marketing-snapshot-run-query', 'marketing-snapshot');
    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(setStatusState).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      'Auto-running top opportunity query: "best rooftop events nyc".',
      'loading',
    );
  });

  it('tracks playbook intake open event from rendered dataset attributes', async () => {
    renderMarketingSnapshotDom();
    const queryInput = document.getElementById('smart-search-query') as HTMLInputElement;
    queryInput.value = 'keep-existing-query';
    const trackCTA = vi.fn();
    const trackEvent = vi.fn(async () => {});

    initMarketingSnapshotController({
      preferences_storage_key: 'snapshot-prefs',
      readMarketingSnapshotPreferences: () => ({
        auto_run_top_opportunity: true,
        auto_run_recovery: true,
        auto_run_escalation: true,
        escalation_cooldown_hours: 24,
        auto_apply_recommended: true,
        auto_run_pause_until: null,
      }),
      writeMarketingSnapshotPreferences: vi.fn(),
      requestInsightsHub: vi.fn(async () => ({
        status: 200,
        body: createPayload(),
      })),
      renderMarketingSnapshotCards: (_input) => {
        _input.intake_link.hidden = false;
        _input.intake_link.dataset.playbookUseCase = 'marketing_analytics';
        _input.intake_link.dataset.playbookTeamSize = 'small_2_10';
        _input.intake_link.dataset.playbookRoute = 'marketing_consult';
        _input.intake_link.dataset.playbookConfidence = 'high';
      },
      trackCTA,
      trackEvent,
      setStatusState: vi.fn(),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const intakeLink = document.getElementById('marketing-snapshot-open-intake') as HTMLAnchorElement;
    intakeLink.addEventListener('click', (event) => event.preventDefault());
    intakeLink.click();

    expect(trackCTA).toHaveBeenCalledWith('marketing-snapshot-open-playbook-intake', 'marketing-snapshot');
    expect(trackEvent).toHaveBeenCalledWith({
      event_name: 'marketing_snapshot_playbook_intake_opened',
      properties: {
        surface: 'landing',
        use_case: 'marketing_analytics',
        team_size: 'small_2_10',
        route: 'marketing_consult',
        confidence: 'high',
      },
    });
  });

  it('renders automation execution diagnostics for auto-run gates', async () => {
    renderMarketingSnapshotDom();
    const form = document.getElementById('smart-search-form') as HTMLFormElement;
    vi.spyOn(form, 'requestSubmit').mockImplementation(() => {});

    initMarketingSnapshotController({
      preferences_storage_key: 'snapshot-prefs',
      readMarketingSnapshotPreferences: () => ({
        auto_run_top_opportunity: true,
        auto_run_recovery: true,
        auto_run_escalation: true,
        escalation_cooldown_hours: 24,
        auto_apply_recommended: true,
        auto_run_pause_until: null,
      }),
      writeMarketingSnapshotPreferences: vi.fn(),
      requestInsightsHub: vi.fn(async () => ({
        status: 200,
        body: createPayload(),
      })),
      renderMarketingSnapshotCards: vi.fn(),
      trackCTA: vi.fn(),
      trackEvent: vi.fn(async () => {}),
      setStatusState: vi.fn(),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const automationState = document.getElementById('marketing-snapshot-automation-state') as HTMLUListElement;
    expect(automationState.textContent).toContain('Global auto-runs: ACTIVE.');
    expect(automationState.textContent).toContain('Top-opportunity auto-run: ON');
    expect(automationState.textContent).toContain('Recovery auto-run: ON');
    expect(automationState.textContent).toContain('Escalation auto-run: ON');
  });

  it('skips auto-run actions while a pause window is active', async () => {
    renderMarketingSnapshotDom();
    const form = document.getElementById('smart-search-form') as HTMLFormElement;
    const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {});
    const setStatusState = vi.fn();

    initMarketingSnapshotController({
      preferences_storage_key: 'snapshot-prefs',
      readMarketingSnapshotPreferences: () => ({
        auto_run_top_opportunity: true,
        auto_run_recovery: true,
        auto_run_escalation: true,
        escalation_cooldown_hours: 24,
        auto_apply_recommended: true,
        auto_run_pause_until: new Date(Date.now() + (6 * 60 * 60 * 1000)).toISOString(),
      }),
      writeMarketingSnapshotPreferences: vi.fn(),
      requestInsightsHub: vi.fn(async () => ({
        status: 200,
        body: createPayload({
          recommendations: [{ suggested_query: 'query should not run while paused' }],
        }),
      })),
      renderMarketingSnapshotCards: vi.fn(),
      trackCTA: vi.fn(),
      trackEvent: vi.fn(async () => {}),
      setStatusState,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const queryInput = document.getElementById('smart-search-query') as HTMLInputElement;
    expect(queryInput.value).toBe('');
    expect(requestSubmit).not.toHaveBeenCalled();
    expect(setStatusState).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.stringContaining('Auto-run defaults are paused until'),
      'warning',
    );
    expect(document.getElementById('marketing-snapshot-auto-run-pause-state')?.textContent)
      .toContain('Auto-runs paused until');
    expect(document.getElementById('marketing-snapshot-automation-state')?.textContent)
      .toContain('Global auto-runs: PAUSED');
  });

  it('clears query and retries auto-run evaluation from shortcut controls', async () => {
    renderMarketingSnapshotDom();
    const form = document.getElementById('smart-search-form') as HTMLFormElement;
    const requestSubmit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {});
    const queryInput = document.getElementById('smart-search-query') as HTMLInputElement;
    queryInput.value = 'manual query';
    const requestInsightsHub = vi.fn(async () => ({
      status: 200,
      body: createPayload(),
    }));

    initMarketingSnapshotController({
      preferences_storage_key: 'snapshot-prefs',
      readMarketingSnapshotPreferences: () => ({
        auto_run_top_opportunity: true,
        auto_run_recovery: true,
        auto_run_escalation: true,
        escalation_cooldown_hours: 24,
        auto_apply_recommended: true,
        auto_run_pause_until: null,
      }),
      writeMarketingSnapshotPreferences: vi.fn(),
      requestInsightsHub,
      renderMarketingSnapshotCards: vi.fn(),
      trackCTA: vi.fn(),
      trackEvent: vi.fn(async () => {}),
      setStatusState: vi.fn(),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requestSubmit).not.toHaveBeenCalled();

    const clearRetry = document.getElementById('marketing-snapshot-clear-query-retry-auto') as HTMLButtonElement;
    clearRetry.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestInsightsHub).toHaveBeenCalledTimes(2);
    expect(queryInput.value).toBe('best rooftop events nyc');
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it('applies tuning rules manually from shortcut controls', async () => {
    renderMarketingSnapshotDom();
    const queryInput = document.getElementById('smart-search-query') as HTMLInputElement;
    queryInput.value = 'manual query';
    const setStatusState = vi.fn();

    initMarketingSnapshotController({
      preferences_storage_key: 'snapshot-prefs',
      readMarketingSnapshotPreferences: () => ({
        auto_run_top_opportunity: true,
        auto_run_recovery: true,
        auto_run_escalation: true,
        escalation_cooldown_hours: 24,
        auto_apply_recommended: true,
        auto_run_pause_until: null,
      }),
      writeMarketingSnapshotPreferences: vi.fn(),
      requestInsightsHub: vi.fn(async () => ({
        status: 200,
        body: createPayload({
          weekly_playbook: { confidence: 'low' },
          automation_tuning_rules: [
            {
              id: 'tune_auto_run_recovery',
              setting: false,
              confidence: 'high',
            },
          ],
        }),
      })),
      renderMarketingSnapshotCards: vi.fn(),
      trackCTA: vi.fn(),
      trackEvent: vi.fn(async () => {}),
      setStatusState,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const recoveryToggle = document.getElementById('marketing-snapshot-auto-run-recovery') as HTMLInputElement;
    expect(recoveryToggle.checked).toBe(true);

    const applyRules = document.getElementById('marketing-snapshot-apply-tuning-rules-now') as HTMLButtonElement;
    applyRules.click();

    expect(recoveryToggle.checked).toBe(false);
    expect(setStatusState).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.stringContaining('Applied tuning rules: 1/1'),
      'success',
    );
  });
});
