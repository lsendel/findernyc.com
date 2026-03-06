import { pgTable, serial, timestamp, varchar, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  source_cta: varchar('source_cta', { length: 100 }),
  source_section: varchar('source_section', { length: 50 }),
  use_case: varchar('use_case', { length: 40 }),
  team_size: varchar('team_size', { length: 40 }),
  city: varchar('city', { length: 100 }),
  borough: varchar('borough', { length: 30 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const waitlist_entries = pgTable('waitlist_entries', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  zip_code: varchar('zip_code', { length: 10 }),
  city: varchar('city', { length: 100 }),
  use_case: varchar('use_case', { length: 40 }),
  team_size: varchar('team_size', { length: 40 }),
  goal: varchar('goal', { length: 180 }),
  follow_up_route: varchar('follow_up_route', { length: 40 }),
  follow_up_priority: varchar('follow_up_priority', { length: 20 }),
  follow_up_status: varchar('follow_up_status', { length: 30 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const analytics_events = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  event_name: varchar('event_name', { length: 100 }).notNull(),
  properties: jsonb('properties'),
  session_id: varchar('session_id', { length: 64 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const saved_searches = pgTable('saved_searches', {
  id: serial('id').primaryKey(),
  query_text: varchar('query_text', { length: 200 }).notNull(),
  filters: jsonb('filters'),
  channel: varchar('channel', { length: 20 }).notNull(),
  destination: varchar('destination', { length: 255 }),
  session_id: varchar('session_id', { length: 64 }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow(),
});

export const alert_delivery_attempts = pgTable('alert_delivery_attempts', {
  id: serial('id').primaryKey(),
  saved_search_id: integer('saved_search_id').notNull(),
  channel: varchar('channel', { length: 20 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  delivery: varchar('delivery', { length: 20 }).notNull(),
  success: boolean('success').notNull(),
  attempt_count: integer('attempt_count').notNull(),
  status_code: integer('status_code'),
  error: varchar('error', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
});
