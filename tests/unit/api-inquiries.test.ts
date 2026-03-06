import { describe, it, expect } from 'vitest';
import app from '../../src/index';

describe('inquiries API', () => {
  it('returns 503 when one_click_inquiry_application is disabled', async () => {
    const res = await app.request('/api/inquiries/profile?session_id=test-session', undefined, {
      FEATURE_FLAGS: '-one_click_inquiry_application',
    });
    expect(res.status).toBe(503);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('feature_disabled');
  });

  it('returns empty profile when enabled and no session profile exists', async () => {
    const res = await app.request(
      '/api/inquiries/profile?session_id=test-session-empty',
      undefined,
      { FEATURE_FLAGS: 'one_click_inquiry_application' },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; profile: unknown };
    expect(json.success).toBe(true);
    expect(json.profile).toBeNull();
  });

  it('creates one-click inquiry and persists profile for session autofill', async () => {
    const first = await app.request(
      '/api/inquiries/one-click',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: 'evt_001',
          session_id: 'session-123',
          profile: {
            full_name: 'Taylor Rivera',
            email: 'taylor@example.com',
            phone: '+1-212-555-0110',
            preferred_contact_channel: 'email',
          },
          message: 'Interested in group availability.',
        }),
      },
      { FEATURE_FLAGS: 'one_click_inquiry_application' },
    );

    expect(first.status).toBe(201);
    const firstJson = await first.json() as {
      success: boolean;
      inquiry: { id: string; event_id: string; profile: { full_name: string; email: string } };
      autofill_profile: { full_name: string; email: string };
    };
    expect(firstJson.success).toBe(true);
    expect(firstJson.inquiry.id).toContain('inq_');
    expect(firstJson.inquiry.event_id).toBe('evt_001');
    expect(firstJson.autofill_profile.full_name).toBe('Taylor Rivera');

    const second = await app.request(
      '/api/inquiries/one-click',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: 'evt_002',
          session_id: 'session-123',
          autofill_from_session: true,
        }),
      },
      { FEATURE_FLAGS: 'one_click_inquiry_application' },
    );

    expect(second.status).toBe(201);
    const secondJson = await second.json() as {
      success: boolean;
      inquiry: { event_id: string; profile: { full_name: string; email: string } };
    };
    expect(secondJson.success).toBe(true);
    expect(secondJson.inquiry.event_id).toBe('evt_002');
    expect(secondJson.inquiry.profile.full_name).toBe('Taylor Rivera');
    expect(secondJson.inquiry.profile.email).toBe('taylor@example.com');
  });

  it('returns 422 when profile is incomplete', async () => {
    const res = await app.request(
      '/api/inquiries/one-click',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: 'evt_001',
          profile: {
            full_name: 'Only Name',
          },
        }),
      },
      { FEATURE_FLAGS: 'one_click_inquiry_application' },
    );

    expect(res.status).toBe(422);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('profile_incomplete');
  });

  it('returns 404 for unknown event id', async () => {
    const res = await app.request(
      '/api/inquiries/one-click',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: 'evt_unknown',
          profile: {
            full_name: 'Taylor Rivera',
            email: 'taylor@example.com',
          },
        }),
      },
      { FEATURE_FLAGS: 'one_click_inquiry_application' },
    );

    expect(res.status).toBe(404);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('event_not_found');
  });
});
