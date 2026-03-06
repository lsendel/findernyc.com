import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOneClickInquiry, syncCalendarSchedule } from '../../src/assets/js/inquiry-scheduling-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('inquiry scheduling client', () => {
  it('sends one-click inquiry payload with autofill flag and handles 204 responses', async () => {
    const jsonMock = vi.fn(async () => ({ success: true }));
    const fetchMock = vi.fn(async () => ({ status: 204, json: jsonMock }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await createOneClickInquiry({
      event_id: 'evt_101',
      session_id: 'sess_22',
      profile: {
        full_name: 'Alex Doe',
        email: 'alex@example.com',
        phone: '+1-212-555-1111',
        preferred_contact_channel: 'email',
        note: 'Prefer weekday afternoons',
      },
    });

    expect(response).toEqual({ status: 204, body: null });
    expect(fetchMock).toHaveBeenCalledWith('/api/inquiries/one-click', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(call[1].body));
    expect(body.autofill_from_session).toBe(true);
    expect(body.event_id).toBe('evt_101');
    expect(body.session_id).toBe('sess_22');
    expect(body.profile.full_name).toBe('Alex Doe');
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it('sends calendar sync payload and returns schedule conflicts unchanged', async () => {
    const conflictBody = {
      success: false,
      error: 'schedule_conflict',
      conflicts: [{
        source: 'google_calendar',
        start_at: '2026-03-15T18:00:00.000Z',
        end_at: '2026-03-15T19:00:00.000Z',
        label: 'Existing hold',
      }],
    };
    const fetchMock = vi.fn(async () => ({ status: 409, json: async () => conflictBody }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await syncCalendarSchedule({
      inquiry_id: 'inq_8',
      event_id: 'evt_8',
      session_id: 'sess_8',
      provider: 'outlook_calendar',
      start_at: '2026-03-15T18:00:00.000Z',
      end_at: '2026-03-15T19:00:00.000Z',
      timezone: 'America/New_York',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/scheduling/calendar-sync', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(String(call[1].body));
    expect(payload.provider).toBe('outlook_calendar');
    expect(payload.inquiry_id).toBe('inq_8');
    expect(response.status).toBe(409);
    expect(response.body).toEqual(conflictBody);
  });
});
