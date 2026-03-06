export const calendarProviderValues = ['google_calendar', 'outlook_calendar', 'apple_calendar'] as const;
export type CalendarProvider = (typeof calendarProviderValues)[number];

export type CalendarAdapterEnv = {
  SCHEDULING_GOOGLE_ENDPOINT_URL?: string;
  SCHEDULING_OUTLOOK_ENDPOINT_URL?: string;
  SCHEDULING_APPLE_ENDPOINT_URL?: string;
  SCHEDULING_GOOGLE_AUTH_TOKEN?: string;
  SCHEDULING_OUTLOOK_AUTH_TOKEN?: string;
  SCHEDULING_APPLE_AUTH_TOKEN?: string;
};

export type CalendarSyncInput = {
  provider: CalendarProvider;
  inquiry_id: string;
  event_id: string;
  title: string;
  attendee_email: string;
  start_at: string;
  end_at: string;
  timezone: string;
  notes?: string;
};

export type CalendarSyncResult = {
  success: boolean;
  provider: CalendarProvider;
  delivery: 'stub' | 'queued';
  external_event_id: string;
  status_code?: number;
  calendar_url?: string;
  error?: string;
};

function resolveProviderConfig(provider: CalendarProvider, env: CalendarAdapterEnv): {
  endpoint_url?: string;
  auth_token?: string;
  calendar_url_base: string;
} {
  if (provider === 'google_calendar') {
    return {
      endpoint_url: env.SCHEDULING_GOOGLE_ENDPOINT_URL,
      auth_token: env.SCHEDULING_GOOGLE_AUTH_TOKEN,
      calendar_url_base: 'https://calendar.google.com/calendar/event?eid=',
    };
  }

  if (provider === 'outlook_calendar') {
    return {
      endpoint_url: env.SCHEDULING_OUTLOOK_ENDPOINT_URL,
      auth_token: env.SCHEDULING_OUTLOOK_AUTH_TOKEN,
      calendar_url_base: 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&id=',
    };
  }

  return {
    endpoint_url: env.SCHEDULING_APPLE_ENDPOINT_URL,
    auth_token: env.SCHEDULING_APPLE_AUTH_TOKEN,
    calendar_url_base: 'webcal://calendar.apple.com/event/',
  };
}

function buildExternalId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function syncCalendarEvent(input: CalendarSyncInput, env: CalendarAdapterEnv): Promise<CalendarSyncResult> {
  const providerConfig = resolveProviderConfig(input.provider, env);

  if (!providerConfig.endpoint_url?.trim()) {
    const external_event_id = buildExternalId(input.provider);
    return {
      success: true,
      provider: input.provider,
      delivery: 'stub',
      external_event_id,
      calendar_url: `${providerConfig.calendar_url_base}${encodeURIComponent(external_event_id)}`,
    };
  }

  try {
    const response = await fetch(providerConfig.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(providerConfig.auth_token?.trim()
          ? { Authorization: `Bearer ${providerConfig.auth_token.trim()}` }
          : {}),
      },
      body: JSON.stringify({
        inquiry_id: input.inquiry_id,
        event_id: input.event_id,
        title: input.title,
        attendee_email: input.attendee_email,
        start_at: input.start_at,
        end_at: input.end_at,
        timezone: input.timezone,
        notes: input.notes,
      }),
    });

    if (!response.ok) {
      const external_event_id = buildExternalId(input.provider);
      return {
        success: false,
        provider: input.provider,
        delivery: 'queued',
        external_event_id,
        status_code: response.status,
        error: 'provider_sync_failed',
      };
    }

    let external_event_id = buildExternalId(input.provider);
    try {
      const parsed = await response.json() as { external_event_id?: string; calendar_url?: string };
      if (typeof parsed.external_event_id === 'string' && parsed.external_event_id.trim()) {
        external_event_id = parsed.external_event_id.trim();
      }
      return {
        success: true,
        provider: input.provider,
        delivery: 'queued',
        external_event_id,
        status_code: response.status,
        calendar_url: typeof parsed.calendar_url === 'string' && parsed.calendar_url.trim()
          ? parsed.calendar_url.trim()
          : `${providerConfig.calendar_url_base}${encodeURIComponent(external_event_id)}`,
      };
    } catch {
      return {
        success: true,
        provider: input.provider,
        delivery: 'queued',
        external_event_id,
        status_code: response.status,
        calendar_url: `${providerConfig.calendar_url_base}${encodeURIComponent(external_event_id)}`,
      };
    }
  } catch {
    const external_event_id = buildExternalId(input.provider);
    return {
      success: false,
      provider: input.provider,
      delivery: 'queued',
      external_event_id,
      error: 'provider_unreachable',
    };
  }
}
