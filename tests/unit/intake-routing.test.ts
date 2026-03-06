import { describe, expect, it } from 'vitest';
import {
  normalizeIntakeTeamSize,
  normalizeIntakeUseCase,
  resolveWaitlistFollowUpRoute,
  resolveWaitlistRouteAction,
  resolveWaitlistRoutePreviewText,
  resolveWaitlistSubmitLabel,
} from '../../src/assets/js/intake-routing';
import { resolveIntakeFollowUpDecision } from '../../src/intake/routing';

describe('shared intake routing helpers', () => {
  it('normalizes supported use cases and team sizes', () => {
    expect(normalizeIntakeUseCase('marketing_analytics')).toBe('marketing_analytics');
    expect(normalizeIntakeUseCase('invalid')).toBeUndefined();
    expect(normalizeIntakeTeamSize('mid_11_50')).toBe('mid_11_50');
    expect(normalizeIntakeTeamSize('unknown')).toBeUndefined();
  });

  it('maps route labels, previews, and next actions consistently', () => {
    expect(resolveWaitlistSubmitLabel('sales_demo')).toBe('Request Sales Demo');
    expect(resolveWaitlistRoutePreviewText('sales_demo')).toContain('Sales demo track');
    expect(resolveWaitlistRouteAction('sales_demo')).toEqual({
      routeMessage: ' Next step: sales demo routing has been queued.',
      routeHref: '/#pricing',
      routeLabel: 'Compare Plans',
    });
  });

  it('keeps frontend route decision aligned with backend intake decision for demo-intent fallback', () => {
    const input = {
      team_size: 'mid_11_50' as const,
      goal: 'Need a consult demo for onboarding and rollout',
    };
    const clientRoute = resolveWaitlistFollowUpRoute(input);
    const serverRoute = resolveIntakeFollowUpDecision(input).route;
    expect(clientRoute).toBe('sales_demo');
    expect(serverRoute).toBe(clientRoute);
  });
});

