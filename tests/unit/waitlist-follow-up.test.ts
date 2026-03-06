import { describe, expect, it } from 'vitest';
import { resolveWaitlistFollowUpDecision } from '../../src/waitlist/follow-up';

describe('resolveWaitlistFollowUpDecision', () => {
  it('routes consumer discovery to community waitlist', () => {
    const decision = resolveWaitlistFollowUpDecision({
      use_case: 'consumer_discovery',
      team_size: 'solo',
      goal: 'find things to do this weekend',
    });

    expect(decision.route).toBe('community_waitlist');
    expect(decision.priority).toBe('standard');
  });

  it('routes marketing analytics to marketing consult', () => {
    const decision = resolveWaitlistFollowUpDecision({
      use_case: 'marketing_analytics',
      team_size: 'mid_11_50',
      goal: 'need a conversion strategy demo',
    });

    expect(decision.route).toBe('marketing_consult');
    expect(decision.priority).toBe('high');
  });

  it('routes enterprise and partnership intents to partnership review', () => {
    const decision = resolveWaitlistFollowUpDecision({
      use_case: 'business_listing',
      team_size: 'enterprise_50_plus',
      goal: 'agency partnership onboarding',
    });

    expect(decision.route).toBe('partnership_review');
    expect(decision.priority).toBe('high');
  });

  it('routes demo intent with mid-market team to sales demo even without explicit use case', () => {
    const decision = resolveWaitlistFollowUpDecision({
      team_size: 'mid_11_50',
      goal: 'Need a consult demo for launch onboarding',
    });

    expect(decision.route).toBe('sales_demo');
    expect(decision.priority).toBe('high');
  });
});
