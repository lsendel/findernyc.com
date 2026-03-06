import { normalizeIntakeTeamSize, normalizeIntakeUseCase, type IntakeUseCase } from './intake-routing';

const ONBOARDING_PREFERENCES_KEY = 'localgems_onboarding_preferences_v1';
const ONBOARDING_PROFILE_KEY = 'localgems_onboarding_profile_v1';

type OnboardingRole = 'consumer' | 'marketer' | 'business';

type OnboardingProfile = {
  role: OnboardingRole;
  city?: string;
  borough?: string;
  team_size?: string;
};

function buildContactPrefillHref(input: {
  use_case?: IntakeUseCase;
  team_size?: string;
  city?: string;
  goal?: string;
}): string {
  const params = new URLSearchParams();
  if (input.use_case) params.set('use_case', input.use_case);
  const normalizedTeamSize = normalizeIntakeTeamSize(input.team_size);
  if (normalizedTeamSize) params.set('team_size', normalizedTeamSize);
  const city = input.city?.trim();
  if (city) params.set('city', city.slice(0, 100));
  const goal = input.goal?.trim();
  if (goal) params.set('goal', goal.slice(0, 180));
  const query = params.toString();
  return query ? `/contact?${query}` : '/contact';
}

function resolveUseCaseFromRole(role: OnboardingRole): IntakeUseCase {
  if (role === 'marketer') return 'marketing_analytics';
  if (role === 'business') return 'business_listing';
  return 'consumer_discovery';
}

function formatTeamSize(value: string): string {
  const normalized = normalizeIntakeTeamSize(value);
  if (normalized === 'small_2_10') return '2-10';
  if (normalized === 'mid_11_50') return '11-50';
  if (normalized === 'enterprise_50_plus') return '50+';
  if (normalized === 'solo') return 'solo';
  return '';
}

function readOnboardingProfile(): OnboardingProfile | null {
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
    if (!autofillAllowed) return null;

    const raw = localStorage.getItem(ONBOARDING_PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as Record<string, unknown>;
    if (!profile || typeof profile !== 'object') return null;

    const role = profile.role;
    if (role !== 'consumer' && role !== 'marketer' && role !== 'business') return null;

    return {
      role,
      ...(typeof profile.city === 'string' ? { city: profile.city.slice(0, 100) } : {}),
      ...(typeof profile.borough === 'string' ? { borough: profile.borough } : {}),
      ...(typeof profile.team_size === 'string' ? { team_size: profile.team_size } : {}),
    };
  } catch {
    return null;
  }
}

function initContentWorkflowShortcuts(): void {
  const status = document.getElementById('content-workflow-status');
  const primaryAction = document.getElementById('content-workflow-primary') as HTMLAnchorElement | null;
  const intakeAction = document.getElementById('content-workflow-intake') as HTMLAnchorElement | null;
  if (!status || !primaryAction || !intakeAction) return;

  const profile = readOnboardingProfile();
  if (!profile) return;

  const roleLabel = profile.role === 'consumer'
    ? 'Discover Events'
    : profile.role === 'marketer'
      ? 'Marketing'
      : 'Business Listings';
  const city = profile.city?.trim().slice(0, 100) ?? '';
  const borough = profile.borough?.replaceAll('_', ' ') ?? '';
  const teamSize = profile.team_size ? formatTeamSize(profile.team_size) : '';
  const context = [roleLabel, city, borough, teamSize ? `team ${teamSize}` : ''].filter(Boolean).join(' | ');
  status.textContent = context
    ? `Profile active: ${context}. Shortcuts are tuned for this workflow.`
    : 'Profile active. Shortcuts are tuned for this workflow.';

  const useCase = normalizeIntakeUseCase(resolveUseCaseFromRole(profile.role));

  if (profile.role === 'consumer') {
    primaryAction.textContent = 'Run Smart Search';
    primaryAction.setAttribute('href', '/#smart-search');
    intakeAction.textContent = 'Open Discovery Intake';
    intakeAction.setAttribute('href', buildContactPrefillHref({
      use_case: useCase,
      team_size: profile.team_size,
      city,
      goal: 'Find local events that fit my weekly schedule',
    }));
    return;
  }

  if (profile.role === 'marketer') {
    primaryAction.textContent = 'Open Marketing Intake';
    primaryAction.setAttribute('href', buildContactPrefillHref({
      use_case: useCase,
      team_size: profile.team_size,
      city,
      goal: 'Improve ranking, CTR, and inquiry conversion',
    }));
    intakeAction.textContent = 'Open Analytics Demo';
    intakeAction.setAttribute('href', '/analytics');
    return;
  }

  primaryAction.textContent = 'Open Business Intake';
  primaryAction.setAttribute('href', buildContactPrefillHref({
    use_case: useCase,
    team_size: profile.team_size,
    city,
    goal: 'Improve listing visibility and booking conversion',
  }));
  intakeAction.textContent = 'Review Partnership Program';
  intakeAction.setAttribute('href', '/partnership');
}

document.addEventListener('DOMContentLoaded', initContentWorkflowShortcuts);
