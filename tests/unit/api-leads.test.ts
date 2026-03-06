import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so these are available when vi.mock factory is hoisted
const { mockReturning, mockValues, mockInsert, mockCreateDb } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn();
  const mockInsert = vi.fn();
  const mockCreateDb = vi.fn();
  return { mockReturning, mockValues, mockInsert, mockCreateDb };
});

vi.mock('../../src/db/client', () => ({
  createDb: mockCreateDb,
}));

import app from '../../src/index';

describe('POST /api/leads', () => {
  const env = { DATABASE_URL: 'postgres://test-db' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([{ id: 1 }]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    mockCreateDb.mockReturnValue({ insert: mockInsert });
  });

  it('returns 201 with id and follow-up routing metadata on valid email', async () => {
    const res = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    }, env);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      success: true,
      id: 1,
      follow_up: {
        route: 'community_waitlist',
        priority: 'standard',
        automation_status: 'not_configured',
        automation_provider: 'waitlist_follow_up',
      },
    });
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('persists optional lead context fields when provided', async () => {
    const res = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'context@example.com',
        use_case: 'marketing_analytics',
        team_size: 'small_2_10',
        city: 'New York',
        borough: 'brooklyn',
      }),
    }, env);

    expect(res.status).toBe(201);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'context@example.com',
        use_case: 'marketing_analytics',
        team_size: 'small_2_10',
        city: 'New York',
        borough: 'brooklyn',
      }),
    );
  });

  it('applies shared intake routing policy for follow-up decisions', async () => {
    const res = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'enterprise@example.com',
        use_case: 'business_listing',
        team_size: 'enterprise_50_plus',
        goal: 'Need agency support for rollout',
      }),
    }, env);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.follow_up).toEqual({
      route: 'partnership_review',
      priority: 'high',
      automation_status: 'not_configured',
      automation_provider: 'waitlist_follow_up',
    });
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
      email: 'enterprise@example.com',
      follow_up_route: 'partnership_review',
      follow_up_priority: 'high',
      follow_up_status: 'pending_lead_capture',
    }));
  });

  it('returns 409 with email_exists on duplicate email (code 23505)', async () => {
    const uniqueError = Object.assign(new Error('duplicate key value'), { code: '23505' });
    mockReturning.mockRejectedValue(uniqueError);

    const res = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'duplicate@example.com' }),
    }, env);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: 'email_exists' });
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('returns 409 with email_exists on duplicate email (unique in message)', async () => {
    const uniqueError = new Error('unique constraint violation');
    mockReturning.mockRejectedValue(uniqueError);

    const res = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dup2@example.com' }),
    }, env);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: 'email_exists' });
  });

  it('returns 422 on invalid email', async () => {
    const res = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    }, env);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 422 on missing body (empty object)', async () => {
    const res = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }, env);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 201 fallback when DATABASE_URL binding is missing', async () => {
    const res = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nodb@example.com' }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      success: true,
      id: 0,
      follow_up: {
        route: 'community_waitlist',
        priority: 'standard',
        automation_status: 'not_configured',
        automation_provider: 'waitlist_follow_up',
      },
    });
    expect(mockCreateDb).not.toHaveBeenCalled();
  });
});
