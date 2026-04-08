import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const spots = sqliteTable('spots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  title: text('title'),
  neighborhood: text('neighborhood'),
  borough: text('borough'),
  category: text('category'),
  description: text('description'),
  one_liner: text('one_liner'),
  pro_tip: text('pro_tip'),
  subway: text('subway'),
  while_here: text('while_here'),
  best_time: text('best_time'),
  avoid_time: text('avoid_time'),
  budget_note: text('budget_note'),
  vibe_tags: text('vibe_tags'),
  price_level: integer('price_level'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  google_maps_url: text('google_maps_url'),
  photo_url: text('photo_url'),
  source: text('source'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
});

export const spot_tips = sqliteTable('spot_tips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  spot_id: integer('spot_id').notNull(),
  text: text('text').notNull(),
  author_name: text('author_name'),
  author_area: text('author_area'),
  approved: integer('approved', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
});

export const neighborhoods = sqliteTable('neighborhoods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  borough: text('borough'),
  vibe: text('vibe'),
  best_for: text('best_for'),
  safety_notes: text('safety_notes'),
  getting_around: text('getting_around'),
  stay_here_if: text('stay_here_if'),
  skip_if: text('skip_if'),
  photo_url: text('photo_url'),
  latitude: real('latitude'),
  longitude: real('longitude'),
});

export const guides = sqliteTable('guides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type'),
  neighborhood: text('neighborhood'),
  borough: text('borough'),
  excerpt: text('excerpt'),
  body_html: text('body_html'),
  cover_photo_url: text('cover_photo_url'),
  seo_title: text('seo_title'),
  seo_description: text('seo_description'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  published_at: integer('published_at', { mode: 'timestamp_ms' }),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
});

export const guide_spots = sqliteTable('guide_spots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guide_id: integer('guide_id').notNull(),
  spot_id: integer('spot_id').notNull(),
  position: integer('position').notNull(),
  context: text('context'),
});

export const ratings = sqliteTable('ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  spot_id: integer('spot_id').notNull(),
  score: integer('score').notNull(),
  session_id: text('session_id'),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
});

export const newsletter_subscribers = sqliteTable('newsletter_subscribers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
});
