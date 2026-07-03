CREATE TABLE `alert_delivery_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`saved_search_id` integer NOT NULL,
	`channel` text NOT NULL,
	`provider` text NOT NULL,
	`delivery` text NOT NULL,
	`success` integer NOT NULL,
	`attempt_count` integer NOT NULL,
	`status_code` integer,
	`error` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`properties` text,
	`session_id` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`source_cta` text,
	`source_section` text,
	`use_case` text,
	`team_size` text,
	`city` text,
	`borough` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`query_text` text NOT NULL,
	`filters` text,
	`channel` text NOT NULL,
	`destination` text,
	`session_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `waitlist_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`zip_code` text,
	`city` text,
	`use_case` text,
	`team_size` text,
	`goal` text,
	`follow_up_route` text,
	`follow_up_priority` text,
	`follow_up_status` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_email_unique` ON `leads` (`email`);