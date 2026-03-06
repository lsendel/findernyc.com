import type { InquiryProfileDraft } from './inquiry-profile';

export type CalendarProvider = 'google_calendar' | 'outlook_calendar' | 'apple_calendar';

export type OneClickInquiryResponse = {
  success: true;
  inquiry: {
    id: string;
    event_id: string;
    session_id?: string;
    profile: {
      full_name: string;
      email: string;
      phone?: string;
      preferred_contact_channel: 'email' | 'sms' | 'phone';
      note?: string;
    };
  };
  autofill_profile: {
    full_name: string;
    email: string;
    phone?: string;
    preferred_contact_channel: 'email' | 'sms' | 'phone';
    note?: string;
  };
};

type OneClickInquiryErrorResponse = {
  success: false;
  error: string;
};

type OneClickInquiryResult = {
  status: number;
  body: OneClickInquiryResponse | OneClickInquiryErrorResponse | null;
};

export type CalendarScheduleResponse = {
  success: true;
  schedule: {
    id: string;
    inquiry_id: string;
    event_id: string;
    provider: CalendarProvider;
    start_at: string;
    end_at: string;
    timezone: string;
    delivery: 'stub' | 'queued';
    calendar_url?: string;
  };
};

type CalendarScheduleErrorResponse = {
  success: false;
  error: string;
  conflicts?: Array<{ source: string; start_at: string; end_at: string; label?: string }>;
};

type CalendarScheduleResult = {
  status: number;
  body: CalendarScheduleResponse | CalendarScheduleErrorResponse | null;
};

export async function createOneClickInquiry(payload: {
  event_id: string;
  session_id?: string;
  profile: InquiryProfileDraft;
}): Promise<OneClickInquiryResult> {
  try {
    const response = await fetch('/api/inquiries/one-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        autofill_from_session: true,
      }),
    });
    if (response.status === 204) {
      return { status: response.status, body: null };
    }
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function syncCalendarSchedule(payload: {
  inquiry_id: string;
  event_id: string;
  session_id?: string;
  provider: CalendarProvider;
  start_at: string;
  end_at: string;
  timezone: string;
}): Promise<CalendarScheduleResult> {
  try {
    const response = await fetch('/api/scheduling/calendar-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}
