import { describe, it, expect } from 'vitest';
import { alert_delivery_attempts, leads, analytics_events, saved_searches } from '../../src/db/schema';

describe('Drizzle schema constraints', () => {
  it('leads.email has a unique constraint', () => {
    const emailCol = leads.email;
    // Drizzle stores column config; unique columns have isUnique set
    expect((emailCol as any).isUnique).toBe(true);
  });

  it('leads.email is not null', () => {
    const emailCol = leads.email;
    expect((emailCol as any).notNull).toBe(true);
  });

  it('analytics_events.event_name is not null', () => {
    const eventNameCol = analytics_events.event_name;
    expect((eventNameCol as any).notNull).toBe(true);
  });

  it('saved_searches.query_text is not null', () => {
    const queryCol = saved_searches.query_text;
    expect((queryCol as any).notNull).toBe(true);
  });

  it('alert_delivery_attempts.saved_search_id is not null', () => {
    const idCol = alert_delivery_attempts.saved_search_id;
    expect((idCol as any).notNull).toBe(true);
  });

  it('alert_delivery_attempts.attempt_count is not null', () => {
    const attemptCol = alert_delivery_attempts.attempt_count;
    expect((attemptCol as any).notNull).toBe(true);
  });
});
