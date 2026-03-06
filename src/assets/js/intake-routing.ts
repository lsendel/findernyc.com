export type IntakeUseCase =
  | 'consumer_discovery'
  | 'business_listing'
  | 'marketing_analytics'
  | 'agency_partnership';

export type IntakeTeamSize =
  | 'solo'
  | 'small_2_10'
  | 'mid_11_50'
  | 'enterprise_50_plus';

export type WaitlistFollowUpRoute =
  | 'community_waitlist'
  | 'self_serve_onboarding'
  | 'marketing_consult'
  | 'sales_demo'
  | 'partnership_review';

export type WaitlistRouteAction = {
  routeMessage: string;
  routeHref: string;
  routeLabel: string;
};

export function normalizeIntakeUseCase(value: unknown): IntakeUseCase | undefined {
  if (
    value === 'consumer_discovery'
    || value === 'business_listing'
    || value === 'marketing_analytics'
    || value === 'agency_partnership'
  ) {
    return value;
  }
  return undefined;
}

export function normalizeIntakeTeamSize(value: unknown): IntakeTeamSize | undefined {
  if (
    value === 'solo'
    || value === 'small_2_10'
    || value === 'mid_11_50'
    || value === 'enterprise_50_plus'
  ) {
    return value;
  }
  return undefined;
}

export function resolveWaitlistFollowUpRoute(input: {
  use_case?: IntakeUseCase;
  team_size?: IntakeTeamSize;
  goal?: string;
}): WaitlistFollowUpRoute {
  const useCase = input.use_case;
  const teamSize = input.team_size;
  const goal = input.goal?.trim().toLowerCase() ?? '';
  const mentionsPartnership = goal.includes('partner') || goal.includes('agency');
  const mentionsDemo = goal.includes('demo') || goal.includes('consult') || goal.includes('strategy');
  const isEnterprise = teamSize === 'enterprise_50_plus';
  const isMidOrAbove = teamSize === 'mid_11_50' || isEnterprise;

  if (useCase === 'agency_partnership' || mentionsPartnership || isEnterprise) return 'partnership_review';
  if (useCase === 'marketing_analytics') return 'marketing_consult';
  if (useCase === 'business_listing') return isMidOrAbove ? 'sales_demo' : 'self_serve_onboarding';
  if (mentionsDemo && isMidOrAbove) return 'sales_demo';
  return 'community_waitlist';
}

export function normalizeWaitlistFollowUpRoute(value: unknown): WaitlistFollowUpRoute | undefined {
  if (
    value === 'community_waitlist'
    || value === 'self_serve_onboarding'
    || value === 'marketing_consult'
    || value === 'sales_demo'
    || value === 'partnership_review'
  ) {
    return value;
  }
  return undefined;
}

export function resolveWaitlistSubmitLabel(route: WaitlistFollowUpRoute): string {
  if (route === 'marketing_consult') return 'Request Marketing Consult';
  if (route === 'sales_demo') return 'Request Sales Demo';
  if (route === 'partnership_review') return 'Request Partnership Review';
  if (route === 'self_serve_onboarding') return 'Start Self-Serve Setup';
  return 'Join the Waitlist';
}

export function resolveWaitlistRoutePreviewText(route: WaitlistFollowUpRoute): string {
  if (route === 'marketing_consult') {
    return 'Routing preview: Marketing consult track with ranking and conversion recommendations.';
  }
  if (route === 'sales_demo') {
    return 'Routing preview: Sales demo track for team onboarding and advanced operations.';
  }
  if (route === 'partnership_review') {
    return 'Routing preview: Partnership review track for agency and multi-program teams.';
  }
  if (route === 'self_serve_onboarding') {
    return 'Routing preview: Self-serve onboarding track with Smart Search and saved alerts.';
  }
  return 'Routing preview: Community waitlist track with personalized discovery updates.';
}

export function resolveWaitlistRouteAction(route: WaitlistFollowUpRoute): WaitlistRouteAction {
  if (route === 'marketing_consult') {
    return {
      routeMessage: ' Next step: marketing consult routing has been queued.',
      routeHref: '/analytics',
      routeLabel: 'Open Analytics Demo',
    };
  }
  if (route === 'sales_demo') {
    return {
      routeMessage: ' Next step: sales demo routing has been queued.',
      routeHref: '/#pricing',
      routeLabel: 'Compare Plans',
    };
  }
  if (route === 'partnership_review') {
    return {
      routeMessage: ' Next step: partnership review routing has been queued.',
      routeHref: '/partnership',
      routeLabel: 'Open Partnership Program',
    };
  }
  if (route === 'self_serve_onboarding') {
    return {
      routeMessage: ' Next step: self-serve onboarding routing has been queued.',
      routeHref: '/#smart-search',
      routeLabel: 'Go To Smart Search',
    };
  }
  return {
    routeMessage: '',
    routeHref: '/',
    routeLabel: 'Explore Home',
  };
}
