import { z } from 'zod';

export const intakeUseCaseSchema = z.enum([
  'consumer_discovery',
  'business_listing',
  'marketing_analytics',
  'agency_partnership',
]);

export const intakeTeamSizeSchema = z.enum([
  'solo',
  'small_2_10',
  'mid_11_50',
  'enterprise_50_plus',
]);

export type IntakeUseCase = z.infer<typeof intakeUseCaseSchema>;
export type IntakeTeamSize = z.infer<typeof intakeTeamSizeSchema>;

export type IntakeFollowUpRoute =
  | 'community_waitlist'
  | 'self_serve_onboarding'
  | 'marketing_consult'
  | 'sales_demo'
  | 'partnership_review';

export type IntakeFollowUpPriority = 'standard' | 'high';

export type IntakeFollowUpDecision = {
  route: IntakeFollowUpRoute;
  priority: IntakeFollowUpPriority;
};

export function resolveIntakeFollowUpDecision(input: {
  use_case?: IntakeUseCase;
  team_size?: IntakeTeamSize;
  goal?: string;
}): IntakeFollowUpDecision {
  const useCase = input.use_case;
  const teamSize = input.team_size;
  const goal = input.goal?.trim().toLowerCase() ?? '';
  const mentionsPartnership = goal.includes('partner') || goal.includes('agency');
  const mentionsDemo = goal.includes('demo') || goal.includes('consult') || goal.includes('strategy');
  const isEnterprise = teamSize === 'enterprise_50_plus';
  const isMidOrAbove = teamSize === 'mid_11_50' || isEnterprise;

  if (useCase === 'agency_partnership' || mentionsPartnership || isEnterprise) {
    return { route: 'partnership_review', priority: 'high' };
  }
  if (useCase === 'marketing_analytics') {
    return { route: 'marketing_consult', priority: isMidOrAbove || mentionsDemo ? 'high' : 'standard' };
  }
  if (useCase === 'business_listing') {
    return { route: isMidOrAbove ? 'sales_demo' : 'self_serve_onboarding', priority: isMidOrAbove ? 'high' : 'standard' };
  }
  if (mentionsDemo && isMidOrAbove) {
    return { route: 'sales_demo', priority: 'high' };
  }
  return { route: 'community_waitlist', priority: 'standard' };
}
