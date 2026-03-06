import type { CalendarProvider } from './calendar-adapters';

export type ScheduledSession = {
  id: string;
  inquiry_id: string;
  event_id: string;
  session_id?: string;
  provider: CalendarProvider;
  start_at: string;
  end_at: string;
  timezone: string;
  external_event_id: string;
  delivery: 'stub' | 'queued';
  status_code?: number;
  calendar_url?: string;
  created_at: string;
};

const sessionsById = new Map<string, ScheduledSession>();

export function listScheduledSessions(params?: { session_id?: string }): ScheduledSession[] {
  const sessionId = params?.session_id?.trim();
  const all = Array.from(sessionsById.values());
  if (!sessionId) {
    return all.map((item) => ({ ...item }));
  }
  return all
    .filter((item) => item.session_id === sessionId)
    .map((item) => ({ ...item }));
}

export function createScheduledSession(input: Omit<ScheduledSession, 'id' | 'created_at'>): ScheduledSession {
  const id = `sch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const session: ScheduledSession = {
    id,
    ...input,
    created_at: new Date().toISOString(),
  };
  sessionsById.set(id, session);
  return { ...session };
}
