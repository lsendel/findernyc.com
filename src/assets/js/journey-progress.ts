import type { IntakeTeamSize, IntakeUseCase } from './intake-routing';

type OnboardingRole = 'consumer' | 'marketer' | 'business';

type OnboardingProfile = {
  role: OnboardingRole;
  city?: string;
  team_size?: IntakeTeamSize;
};

type OnboardingAutoAlertState = {
  created_at: string;
};

type JourneyProgress = {
  search_completed_at?: string;
  alert_created_at?: string;
  lead_submitted_at?: string;
  contact_submitted_at?: string;
};

type InitJourneyProgressOptions = {
  readOnboardingProfile: () => OnboardingProfile | null;
  readJourneyProgress: () => JourneyProgress;
  readOnboardingAutoAlertState: () => OnboardingAutoAlertState | null;
  resolveLeadUseCaseFromRole: (role: OnboardingRole) => IntakeUseCase;
  buildContactPrefillHref: (input: {
    use_case?: IntakeUseCase;
    team_size?: IntakeTeamSize;
    city?: string;
  }) => string;
};

export function initJourneyProgressController(options: InitJourneyProgressOptions): void {
  const section = document.getElementById('journey-progress') as HTMLElement | null;
  const list = document.getElementById('journey-progress-list') as HTMLElement | null;
  const cta = document.getElementById('journey-progress-cta') as HTMLAnchorElement | null;
  if (!section || !list || !cta) return;

  const render = (): void => {
    while (list.firstChild) list.removeChild(list.firstChild);

    const profile = options.readOnboardingProfile();
    const progress = options.readJourneyProgress();
    const autoAlertState = options.readOnboardingAutoAlertState();
    const defaultUseCase = profile ? options.resolveLeadUseCaseFromRole(profile.role) : undefined;

    const steps = [
      {
        id: 'setup',
        label: 'Setup assistant applied',
        done: Boolean(profile),
        href: '/#sign-up',
        cta: 'Complete Setup',
      },
      {
        id: 'search',
        label: 'Smart Search run with live results',
        done: Boolean(progress.search_completed_at),
        href: '/#smart-search',
        cta: 'Run Smart Search',
      },
      {
        id: 'alert',
        label: 'Saved alert configured',
        done: Boolean(progress.alert_created_at || autoAlertState?.created_at),
        href: '/#smart-search',
        cta: 'Create Saved Alert',
      },
      {
        id: 'intake',
        label: 'Intake submitted for follow-up routing',
        done: Boolean(progress.lead_submitted_at || progress.contact_submitted_at),
        href: options.buildContactPrefillHref({
          use_case: defaultUseCase,
          team_size: profile?.team_size,
          city: profile?.city,
        }),
        cta: 'Complete Intake',
      },
    ] as const;

    for (const step of steps) {
      const item = document.createElement('li');
      item.className = `saved-search-item journey-progress-item${step.done ? ' is-complete' : ''}`;
      item.textContent = step.label;
      list.appendChild(item);
    }

    const nextStep = steps.find((step) => !step.done);
    if (nextStep) {
      cta.hidden = false;
      cta.href = nextStep.href;
      cta.textContent = nextStep.cta;
      return;
    }

    cta.hidden = false;
    cta.href = '/#pricing';
    cta.textContent = 'Explore Plans';
  };

  render();
  window.addEventListener('localgems:onboarding-updated', render);
  window.addEventListener('localgems:journey-update', render);
}
