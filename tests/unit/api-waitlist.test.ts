import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockValues, mockInsert, mockCreateDb } = vi.hoisted(() => {
  const mockValues = vi.fn();
  const mockInsert = vi.fn();
  const mockCreateDb = vi.fn();
  return { mockValues, mockInsert, mockCreateDb };
});

vi.mock('../../src/db/client', () => ({
  createDb: mockCreateDb,
}));

import app from '../../src/index';

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockResolvedValue([]);
    mockInsert.mockReturnValue({ values: mockValues });
    mockCreateDb.mockReturnValue({ insert: mockInsert });
  });

  it('returns 201 with { success: true } on valid body', async () => {
    const res = await app.request('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', zip_code: '10001', city: 'New York' }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.follow_up).toBeDefined();
    expect(json.follow_up.automation_status).toBe('not_configured');
  });

  it('returns 201 with only email (optional fields omitted)', async () => {
    const res = await app.request('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'minimal@example.com' }),
    });

    expect(res.status).toBe(201);
  });

  it('accepts optional intent metadata and returns routed follow-up', async () => {
    const res = await app.request('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'marketer@example.com',
        use_case: 'marketing_analytics',
        team_size: 'mid_11_50',
        goal: 'Need dashboard and SEO strategy support',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.follow_up.route).toBe('marketing_consult');
    expect(json.follow_up.priority).toBe('high');
  });

  it('stores follow-up routing details when DATABASE_URL is configured', async () => {
    const res = await app.request('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'biz@example.com',
        use_case: 'business_listing',
        team_size: 'small_2_10',
      }),
    }, { DATABASE_URL: 'postgres://example' });

    expect(res.status).toBe(201);
    expect(mockCreateDb).toHaveBeenCalledWith('postgres://example');
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
      email: 'biz@example.com',
      use_case: 'business_listing',
      team_size: 'small_2_10',
      follow_up_route: 'self_serve_onboarding',
      follow_up_priority: 'standard',
      follow_up_status: 'pending_contact_waitlist',
    }));
  });

  it('routes consult/demo goals with mid-market team to sales demo when use case is omitted', async () => {
    const res = await app.request('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo-intent@example.com',
        team_size: 'mid_11_50',
        goal: 'Request a consult demo for rollout planning',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.follow_up.route).toBe('sales_demo');
    expect(json.follow_up.priority).toBe('high');
  });

  it('returns 422 on invalid email', async () => {
    const res = await app.request('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad-email' }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 422 on missing email', async () => {
    const res = await app.request('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zip_code: '10001' }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 422 on invalid use_case', async () => {
    const res = await app.request('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', use_case: 'invalid' }),
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
