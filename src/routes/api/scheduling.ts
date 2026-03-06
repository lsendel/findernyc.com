import { Hono } from 'hono';
import { z } from 'zod';
import { resolveFeatureFlags } from '../../config/feature-flags';
import { getInquiryById } from '../../inquiries/store';
import {
  calendarProviderValues,
  syncCalendarEvent,
  type CalendarAdapterEnv,
  type CalendarProvider,
} from '../../scheduling/calendar-adapters';
import { createScheduledSession, listScheduledSessions } from '../../scheduling/store';

type Env = {
  Bindings: {
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
    SCHEDULING_GOOGLE_ENDPOINT_URL?: string;
    SCHEDULING_OUTLOOK_ENDPOINT_URL?: string;
    SCHEDULING_APPLE_ENDPOINT_URL?: string;
    SCHEDULING_GOOGLE_AUTH_TOKEN?: string;
    SCHEDULING_OUTLOOK_AUTH_TOKEN?: string;
    SCHEDULING_APPLE_AUTH_TOKEN?: string;
    SCHEDULING_BUSY_WINDOWS_JSON?: string;
  };
};

export const schedulingRouter = new Hono<Env>();

const bodySchema = z.object({
  inquiry_id: z.string().min(1).max(64),
  event_id: z.string().min(1).max(64),
  session_id: z.string().max(64).optional(),
  provider: z.enum(calendarProviderValues),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  timezone: z.string().max(80).default('America/New_York'),
  notes: z.string().max(400).optional(),
});

const busyWindowSchema = z.array(
  z.object({
    start_at: z.string().datetime(),
    end_at: z.string().datetime(),
    label: z.string().max(120).optional(),
    scope: z.enum(['global', 'session']).default('global'),
    session_id: z.string().max(64).optional(),
  }),
).max(200);

type Conflict = {
  source: 'scheduled_session' | 'busy_window';
  start_at: string;
  end_at: string;
  label?: string;
};

function isSchedulingFeatureEnabled(env: Env['Bindings']): boolean {
  return resolveFeatureFlags(env).in_app_scheduling_calendar_sync;
}

function toEpochMs(iso: string): number {
  return new Date(iso).getTime();
}

function isOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function resolveBusyWindows(input: {
  source?: string;
  session_id?: string;
}): Array<{
  start_at: string;
  end_at: string;
  label?: string;
}> {
  if (!input.source?.trim()) return [];

  try {
    const parsed = JSON.parse(input.source);
    const validated = busyWindowSchema.safeParse(parsed);
    if (!validated.success) return [];

    return validated.data
      .filter((item) => {
        if (item.scope === 'global') return true;
        if (!input.session_id) return false;
        return item.session_id === input.session_id;
      })
      .map((item) => ({
        start_at: item.start_at,
        end_at: item.end_at,
        ...(item.label ? { label: item.label } : {}),
      }));
  } catch {
    return [];
  }
}

function collectConflicts(input: {
  session_id?: string;
  start_at: string;
  end_at: string;
  busy_windows: Array<{ start_at: string; end_at: string; label?: string }>;
}): Conflict[] {
  const startMs = toEpochMs(input.start_at);
  const endMs = toEpochMs(input.end_at);
  const conflicts: Conflict[] = [];

  const scheduled = listScheduledSessions({ session_id: input.session_id });
  for (const session of scheduled) {
    if (isOverlap(startMs, endMs, toEpochMs(session.start_at), toEpochMs(session.end_at))) {
      conflicts.push({
        source: 'scheduled_session',
        start_at: session.start_at,
        end_at: session.end_at,
        label: session.provider,
      });
    }
  }

  for (const busyWindow of input.busy_windows) {
    if (isOverlap(startMs, endMs, toEpochMs(busyWindow.start_at), toEpochMs(busyWindow.end_at))) {
      conflicts.push({
        source: 'busy_window',
        start_at: busyWindow.start_at,
        end_at: busyWindow.end_at,
        ...(busyWindow.label ? { label: busyWindow.label } : {}),
      });
    }
  }

  return conflicts;
}

function toCalendarAdapterEnv(env: Env['Bindings']): CalendarAdapterEnv {
  return {
    SCHEDULING_GOOGLE_ENDPOINT_URL: env.SCHEDULING_GOOGLE_ENDPOINT_URL,
    SCHEDULING_OUTLOOK_ENDPOINT_URL: env.SCHEDULING_OUTLOOK_ENDPOINT_URL,
    SCHEDULING_APPLE_ENDPOINT_URL: env.SCHEDULING_APPLE_ENDPOINT_URL,
    SCHEDULING_GOOGLE_AUTH_TOKEN: env.SCHEDULING_GOOGLE_AUTH_TOKEN,
    SCHEDULING_OUTLOOK_AUTH_TOKEN: env.SCHEDULING_OUTLOOK_AUTH_TOKEN,
    SCHEDULING_APPLE_AUTH_TOKEN: env.SCHEDULING_APPLE_AUTH_TOKEN,
  };
}

function validateScheduleWindow(startAt: string, endAt: string): string | undefined {
  const startMs = toEpochMs(startAt);
  const endMs = toEpochMs(endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 'invalid_datetime';
  if (endMs <= startMs) return 'end_before_start';

  const durationMinutes = Math.round((endMs - startMs) / (1000 * 60));
  if (durationMinutes < 15) return 'duration_too_short';
  if (durationMinutes > 240) return 'duration_too_long';

  return undefined;
}

schedulingRouter.post('/calendar-sync', async (c) => {
  if (!isSchedulingFeatureEnabled(c.env)) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const { inquiry_id, event_id, session_id, provider, start_at, end_at, timezone, notes } = parsed.data;
  const inquiry = getInquiryById(inquiry_id);
  if (!inquiry) {
    return c.json({ success: false, error: 'inquiry_not_found' }, 404);
  }
  if (inquiry.event_id !== event_id) {
    return c.json({ success: false, error: 'event_mismatch' }, 422);
  }

  const invalidWindowError = validateScheduleWindow(start_at, end_at);
  if (invalidWindowError) {
    return c.json({ success: false, error: invalidWindowError }, 422);
  }

  const busyWindows = resolveBusyWindows({
    source: c.env.SCHEDULING_BUSY_WINDOWS_JSON,
    session_id: session_id ?? inquiry.session_id,
  });

  const conflicts = collectConflicts({
    session_id: session_id ?? inquiry.session_id,
    start_at,
    end_at,
    busy_windows: busyWindows,
  });
  if (conflicts.length > 0) {
    return c.json({
      success: false,
      error: 'schedule_conflict',
      conflicts,
    }, 409);
  }

  const syncResult = await syncCalendarEvent(
    {
      provider: provider as CalendarProvider,
      inquiry_id,
      event_id,
      title: inquiry.event_title,
      attendee_email: inquiry.profile.email,
      start_at,
      end_at,
      timezone,
      notes,
    },
    toCalendarAdapterEnv(c.env),
  );

  if (!syncResult.success) {
    return c.json(
      {
        success: false,
        error: syncResult.error ?? 'provider_sync_failed',
        provider,
        delivery: syncResult.delivery,
        status_code: syncResult.status_code,
      },
      502,
    );
  }

  const schedule = createScheduledSession({
    inquiry_id,
    event_id,
    session_id: session_id ?? inquiry.session_id,
    provider,
    start_at,
    end_at,
    timezone,
    external_event_id: syncResult.external_event_id,
    delivery: syncResult.delivery,
    status_code: syncResult.status_code,
    calendar_url: syncResult.calendar_url,
  });

  return c.json(
    {
      success: true,
      schedule,
      conflict_checks: {
        conflict_count: 0,
        checked_scheduled_sessions: listScheduledSessions({ session_id: session_id ?? inquiry.session_id }).length,
        checked_busy_windows: busyWindows.length,
      },
    },
    201,
  );
});
