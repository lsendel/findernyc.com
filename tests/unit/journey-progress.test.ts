import { afterEach, describe, expect, it, vi } from 'vitest';
import { initJourneyProgressController } from '../../src/assets/js/journey-progress';

function renderJourneyProgressDom(): void {
  document.body.innerHTML = `
    <section id="journey-progress">
      <ul id="journey-progress-list"></ul>
      <a id="journey-progress-cta" hidden href="/"></a>
    </section>
  `;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('journey progress controller', () => {
  it('shows setup as the next action when no profile/progress exists', () => {
    renderJourneyProgressDom();
    const buildContactPrefillHref = vi.fn(() => '/contact');

    initJourneyProgressController({
      readOnboardingProfile: () => null,
      readJourneyProgress: () => ({}),
      readOnboardingAutoAlertState: () => null,
      resolveLeadUseCaseFromRole: () => 'consumer_discovery',
      buildContactPrefillHref,
    });

    const cta = document.getElementById('journey-progress-cta') as HTMLAnchorElement;
    const items = Array.from(document.querySelectorAll('#journey-progress-list li'));

    expect(items).toHaveLength(4);
    expect(items[0]?.textContent).toBe('Setup assistant applied');
    expect(items[0]?.className).not.toContain('is-complete');
    expect(cta.hidden).toBe(false);
    expect(cta.textContent).toBe('Complete Setup');
    expect(cta.getAttribute('href')).toBe('/#sign-up');
    expect(buildContactPrefillHref).toHaveBeenCalledTimes(1);
    expect(buildContactPrefillHref).toHaveBeenCalledWith({
      use_case: undefined,
      team_size: undefined,
      city: undefined,
    });
  });

  it('routes to intake CTA with profile-aware prefill when intake is the next step', () => {
    renderJourneyProgressDom();
    const buildContactPrefillHref = vi.fn(
      () => '/contact?use_case=marketing_analytics&team_size=small_2_10&city=New%20York',
    );
    const resolveLeadUseCaseFromRole = vi.fn(() => 'marketing_analytics' as const);

    initJourneyProgressController({
      readOnboardingProfile: () => ({
        role: 'marketer',
        city: 'New York',
        team_size: 'small_2_10',
      }),
      readJourneyProgress: () => ({
        search_completed_at: '2026-03-05T10:00:00.000Z',
        alert_created_at: '2026-03-05T10:10:00.000Z',
      }),
      readOnboardingAutoAlertState: () => null,
      resolveLeadUseCaseFromRole,
      buildContactPrefillHref,
    });

    const cta = document.getElementById('journey-progress-cta') as HTMLAnchorElement;

    expect(resolveLeadUseCaseFromRole).toHaveBeenCalledWith('marketer');
    expect(buildContactPrefillHref).toHaveBeenCalledWith({
      use_case: 'marketing_analytics',
      team_size: 'small_2_10',
      city: 'New York',
    });
    expect(cta.textContent).toBe('Complete Intake');
    expect(cta.getAttribute('href')).toContain('/contact?use_case=marketing_analytics');
  });

  it('rerenders on onboarding/journey events and advances to the next step', () => {
    renderJourneyProgressDom();
    let profile: {
      role: 'consumer' | 'marketer' | 'business';
      city?: string;
      team_size?: 'solo' | 'small_2_10' | 'mid_11_50' | 'enterprise_50_plus';
    } | null = null;
    let progress: {
      search_completed_at?: string;
      alert_created_at?: string;
      lead_submitted_at?: string;
      contact_submitted_at?: string;
    } = {};

    initJourneyProgressController({
      readOnboardingProfile: () => profile,
      readJourneyProgress: () => progress,
      readOnboardingAutoAlertState: () => null,
      resolveLeadUseCaseFromRole: () => 'consumer_discovery',
      buildContactPrefillHref: () => '/contact?use_case=consumer_discovery',
    });

    const cta = document.getElementById('journey-progress-cta') as HTMLAnchorElement;
    expect(cta.textContent).toBe('Complete Setup');

    profile = { role: 'consumer', team_size: 'solo' };
    window.dispatchEvent(new Event('localgems:onboarding-updated'));
    expect(cta.textContent).toBe('Run Smart Search');
    expect(cta.getAttribute('href')).toBe('/#smart-search');

    progress = { search_completed_at: '2026-03-05T11:00:00.000Z' };
    window.dispatchEvent(new Event('localgems:journey-update'));
    expect(cta.textContent).toBe('Create Saved Alert');
  });
});
