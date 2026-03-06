import { describe, expect, it } from 'vitest';
import { buildIntakeSubmissionRecord, resolveIntakeFollowUpStatus } from '../../src/intake/persistence';

describe('intake persistence helpers', () => {
  it('maps lead capture channel to lead-specific pending status', () => {
    expect(resolveIntakeFollowUpStatus('lead_capture')).toBe('pending_lead_capture');
  });

  it('maps contact waitlist channel to contact-specific pending status', () => {
    expect(resolveIntakeFollowUpStatus('contact_waitlist')).toBe('pending_contact_waitlist');
  });

  it('builds canonical intake submission records with shared routing fields', () => {
    const record = buildIntakeSubmissionRecord({
      email: 'user@example.com',
      city: 'New York',
      use_case: 'marketing_analytics',
      team_size: 'mid_11_50',
      goal: 'Need strategy support',
      route: 'marketing_consult',
      priority: 'high',
      channel: 'lead_capture',
    });

    expect(record).toEqual(expect.objectContaining({
      email: 'user@example.com',
      city: 'New York',
      use_case: 'marketing_analytics',
      team_size: 'mid_11_50',
      goal: 'Need strategy support',
      follow_up_route: 'marketing_consult',
      follow_up_priority: 'high',
      follow_up_status: 'pending_lead_capture',
    }));
  });
});
