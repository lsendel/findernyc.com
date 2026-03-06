import { describe, it, expect } from 'vitest';
import app from '../../src/index';

async function createInquiryForScheduling(params: {
  event_id: string;
  session_id: string;
}): Promise<string> {
  const res = await app.request(
    '/api/inquiries/one-click',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: params.event_id,
        session_id: params.session_id,
        profile: {
          full_name: 'Schedule Tester',
          email: 'schedule@tester.example',
          preferred_contact_channel: 'email',
        },
      }),
    },
    { FEATURE_FLAGS: 'one_click_inquiry_application,in_app_scheduling_calendar_sync' },
  );
  const json = await res.json() as { inquiry: { id: string } };
  return json.inquiry.id;
}

describe('scheduling API', () => {
  it('returns 503 when scheduling flag is disabled', async () => {
    const res = await app.request(
      '/api/scheduling/calendar-sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id: 'inq_missing',
          event_id: 'evt_001',
          provider: 'google_calendar',
          start_at: '2026-03-03T18:00:00.000Z',
          end_at: '2026-03-03T19:00:00.000Z',
        }),
      },
      { FEATURE_FLAGS: '-in_app_scheduling_calendar_sync' },
    );

    expect(res.status).toBe(503);
  });

  it('returns 404 for unknown inquiry id', async () => {
    const res = await app.request(
      '/api/scheduling/calendar-sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id: 'inq_not_found',
          event_id: 'evt_001',
          provider: 'google_calendar',
          start_at: '2026-03-03T18:00:00.000Z',
          end_at: '2026-03-03T19:00:00.000Z',
          timezone: 'America/New_York',
        }),
      },
      { FEATURE_FLAGS: 'in_app_scheduling_calendar_sync' },
    );

    expect(res.status).toBe(404);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('inquiry_not_found');
  });

  it('schedules inquiry in stub mode when enabled', async () => {
    const inquiry_id = await createInquiryForScheduling({
      event_id: 'evt_001',
      session_id: 'schedule-session-a',
    });

    const res = await app.request(
      '/api/scheduling/calendar-sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id,
          event_id: 'evt_001',
          session_id: 'schedule-session-a',
          provider: 'google_calendar',
          start_at: '2026-03-04T18:00:00.000Z',
          end_at: '2026-03-04T19:00:00.000Z',
          timezone: 'America/New_York',
        }),
      },
      { FEATURE_FLAGS: 'in_app_scheduling_calendar_sync' },
    );

    expect(res.status).toBe(201);
    const json = await res.json() as {
      success: boolean;
      schedule: { id: string; provider: string; delivery: string; inquiry_id: string };
    };
    expect(json.success).toBe(true);
    expect(json.schedule.id).toContain('sch_');
    expect(json.schedule.provider).toBe('google_calendar');
    expect(json.schedule.delivery).toBe('stub');
    expect(json.schedule.inquiry_id).toBe(inquiry_id);
  });

  it('returns 409 when an overlapping session already exists', async () => {
    const inquiry_id = await createInquiryForScheduling({
      event_id: 'evt_002',
      session_id: 'schedule-session-b',
    });

    const first = await app.request(
      '/api/scheduling/calendar-sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id,
          event_id: 'evt_002',
          session_id: 'schedule-session-b',
          provider: 'outlook_calendar',
          start_at: '2026-03-05T17:00:00.000Z',
          end_at: '2026-03-05T18:00:00.000Z',
          timezone: 'America/New_York',
        }),
      },
      { FEATURE_FLAGS: 'in_app_scheduling_calendar_sync' },
    );
    expect(first.status).toBe(201);

    const second = await app.request(
      '/api/scheduling/calendar-sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id,
          event_id: 'evt_002',
          session_id: 'schedule-session-b',
          provider: 'outlook_calendar',
          start_at: '2026-03-05T17:30:00.000Z',
          end_at: '2026-03-05T18:30:00.000Z',
          timezone: 'America/New_York',
        }),
      },
      { FEATURE_FLAGS: 'in_app_scheduling_calendar_sync' },
    );

    expect(second.status).toBe(409);
    const json = await second.json() as {
      success: boolean;
      error: string;
      conflicts: Array<{ source: string }>;
    };
    expect(json.success).toBe(false);
    expect(json.error).toBe('schedule_conflict');
    expect(json.conflicts.length).toBeGreaterThan(0);
    expect(json.conflicts[0]?.source).toBe('scheduled_session');
  });

  it('returns 409 when request overlaps configured busy windows', async () => {
    const inquiry_id = await createInquiryForScheduling({
      event_id: 'evt_003',
      session_id: 'schedule-session-c',
    });

    const res = await app.request(
      '/api/scheduling/calendar-sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id,
          event_id: 'evt_003',
          session_id: 'schedule-session-c',
          provider: 'apple_calendar',
          start_at: '2026-03-06T18:00:00.000Z',
          end_at: '2026-03-06T19:00:00.000Z',
          timezone: 'America/New_York',
        }),
      },
      {
        FEATURE_FLAGS: 'in_app_scheduling_calendar_sync',
        SCHEDULING_BUSY_WINDOWS_JSON: JSON.stringify([
          {
            start_at: '2026-03-06T17:30:00.000Z',
            end_at: '2026-03-06T18:30:00.000Z',
            label: 'provider_busy',
            scope: 'session',
            session_id: 'schedule-session-c',
          },
        ]),
      },
    );

    expect(res.status).toBe(409);
    const json = await res.json() as {
      success: boolean;
      error: string;
      conflicts: Array<{ source: string; label?: string }>;
    };
    expect(json.success).toBe(false);
    expect(json.error).toBe('schedule_conflict');
    expect(json.conflicts.some((item) => item.source === 'busy_window')).toBe(true);
  });
});
