-- Drop old tables
DROP TABLE IF EXISTS `alert_delivery_attempts`;
--> statement-breakpoint
DROP TABLE IF EXISTS `saved_searches`;
--> statement-breakpoint
DROP TABLE IF EXISTS `analytics_events`;
--> statement-breakpoint
DROP TABLE IF EXISTS `waitlist_entries`;
--> statement-breakpoint
DROP TABLE IF EXISTS `leads`;
--> statement-breakpoint

-- Create new tables
CREATE TABLE `spots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `title` text,
  `neighborhood` text,
  `borough` text,
  `category` text,
  `description` text,
  `one_liner` text,
  `pro_tip` text,
  `subway` text,
  `while_here` text,
  `best_time` text,
  `avoid_time` text,
  `budget_note` text,
  `vibe_tags` text,
  `price_level` integer,
  `latitude` real,
  `longitude` real,
  `google_maps_url` text,
  `photo_url` text,
  `source` text,
  `published` integer NOT NULL DEFAULT 0,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spots_slug_unique` ON `spots` (`slug`);
--> statement-breakpoint

CREATE TABLE `spot_tips` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `spot_id` integer NOT NULL,
  `text` text NOT NULL,
  `author_name` text,
  `author_area` text,
  `approved` integer NOT NULL DEFAULT 1,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint

CREATE TABLE `neighborhoods` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `borough` text,
  `vibe` text,
  `best_for` text,
  `safety_notes` text,
  `getting_around` text,
  `stay_here_if` text,
  `skip_if` text,
  `photo_url` text,
  `latitude` real,
  `longitude` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `neighborhoods_slug_unique` ON `neighborhoods` (`slug`);
--> statement-breakpoint

CREATE TABLE `guides` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `slug` text NOT NULL,
  `type` text,
  `neighborhood` text,
  `borough` text,
  `excerpt` text,
  `body_html` text,
  `cover_photo_url` text,
  `seo_title` text,
  `seo_description` text,
  `published` integer NOT NULL DEFAULT 0,
  `published_at` integer,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
  `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guides_slug_unique` ON `guides` (`slug`);
--> statement-breakpoint

CREATE TABLE `guide_spots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `guide_id` integer NOT NULL,
  `spot_id` integer NOT NULL,
  `position` integer NOT NULL,
  `context` text
);
--> statement-breakpoint

CREATE TABLE `ratings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `spot_id` integer NOT NULL,
  `score` integer NOT NULL,
  `session_id` text,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint

CREATE TABLE `newsletter_subscribers` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `email` text NOT NULL,
  `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_email_unique` ON `newsletter_subscribers` (`email`);
--> statement-breakpoint

-- Indexes
CREATE INDEX `idx_spots_borough` ON `spots` (`borough`);
--> statement-breakpoint
CREATE INDEX `idx_spots_category` ON `spots` (`category`);
--> statement-breakpoint
CREATE INDEX `idx_spots_neighborhood` ON `spots` (`neighborhood`);
--> statement-breakpoint
CREATE INDEX `idx_spots_published` ON `spots` (`published`);
--> statement-breakpoint
CREATE INDEX `idx_spot_tips_spot_id` ON `spot_tips` (`spot_id`);
--> statement-breakpoint
CREATE INDEX `idx_ratings_spot_id` ON `ratings` (`spot_id`);
--> statement-breakpoint
CREATE INDEX `idx_guide_spots_guide_id` ON `guide_spots` (`guide_id`);
--> statement-breakpoint
CREATE INDEX `idx_guide_spots_spot_id` ON `guide_spots` (`spot_id`);
--> statement-breakpoint
CREATE INDEX `idx_guides_published` ON `guides` (`published`);
--> statement-breakpoint
CREATE INDEX `idx_guides_type` ON `guides` (`type`);
--> statement-breakpoint

-- FTS5 virtual table for spot search
CREATE VIRTUAL TABLE `spots_fts` USING fts5(
  name,
  title,
  one_liner,
  neighborhood,
  category,
  content=spots,
  content_rowid=id
);
--> statement-breakpoint

-- FTS sync triggers
CREATE TRIGGER spots_ai AFTER INSERT ON spots BEGIN
  INSERT INTO spots_fts(rowid, name, title, one_liner, neighborhood, category)
  VALUES (new.id, new.name, new.title, new.one_liner, new.neighborhood, new.category);
END;
--> statement-breakpoint
CREATE TRIGGER spots_ad AFTER DELETE ON spots BEGIN
  INSERT INTO spots_fts(spots_fts, rowid, name, title, one_liner, neighborhood, category)
  VALUES ('delete', old.id, old.name, old.title, old.one_liner, old.neighborhood, old.category);
END;
--> statement-breakpoint
CREATE TRIGGER spots_au AFTER UPDATE ON spots BEGIN
  INSERT INTO spots_fts(spots_fts, rowid, name, title, one_liner, neighborhood, category)
  VALUES ('delete', old.id, old.name, old.title, old.one_liner, old.neighborhood, old.category);
  INSERT INTO spots_fts(rowid, name, title, one_liner, neighborhood, category)
  VALUES (new.id, new.name, new.title, new.one_liner, new.neighborhood, new.category);
END;
