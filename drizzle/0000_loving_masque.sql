CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`type` text NOT NULL,
	`symbol_or_code` text NOT NULL,
	`name` text NOT NULL,
	`isin` text,
	`exchange` text,
	`category` text,
	`amc` text,
	`sector` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `benchmark_history` (
	`id` text PRIMARY KEY NOT NULL,
	`benchmark_code` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`change` real DEFAULT 0,
	`change_percent` real DEFAULT 0,
	`source` text DEFAULT 'NSE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`portfolio_id` text,
	`name` text NOT NULL,
	`target_amount` real NOT NULL,
	`current_amount` real DEFAULT 0 NOT NULL,
	`target_year` integer,
	`target_date` text,
	`monthly_contribution_target` real,
	`priority` text DEFAULT 'HIGH',
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `market_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`symbol` text NOT NULL,
	`exchange` text DEFAULT 'NSE' NOT NULL,
	`price` real NOT NULL,
	`change` real DEFAULT 0 NOT NULL,
	`change_percent` real DEFAULT 0 NOT NULL,
	`volume` real DEFAULT 0,
	`data_timestamp` text NOT NULL,
	`source` text DEFAULT 'YAHOO_NSE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_prices_symbol_unique` ON `market_prices` (`symbol`);--> statement-breakpoint
CREATE TABLE `mutual_funds` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`scheme_code` text NOT NULL,
	`scheme_name` text NOT NULL,
	`amc` text,
	`category` text,
	`scheme_type` text,
	`scheme_category` text,
	`isin_growth` text,
	`isin_reinv` text,
	`plan` text DEFAULT 'DIRECT',
	`option` text DEFAULT 'GROWTH',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `nav_history` (
	`id` text PRIMARY KEY NOT NULL,
	`scheme_code` text NOT NULL,
	`nav` real NOT NULL,
	`nav_date` text NOT NULL,
	`source` text DEFAULT 'MFAPI' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portfolio_snapshot_items` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`units` real NOT NULL,
	`price_or_nav` real NOT NULL,
	`value` real NOT NULL,
	`invested_amount` real NOT NULL,
	`gain` real NOT NULL,
	`return_percentage` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `portfolio_snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `portfolio_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`total_invested` real NOT NULL,
	`portfolio_value` real NOT NULL,
	`total_gain` real NOT NULL,
	`monthly_contribution` real DEFAULT 0 NOT NULL,
	`monthly_return` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `portfolios` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text DEFAULT 'My Investments' NOT NULL,
	`is_default` integer DEFAULT true NOT NULL,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sip_installments` (
	`id` text PRIMARY KEY NOT NULL,
	`sip_plan_id` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`actual_date` text,
	`amount` real NOT NULL,
	`nav` real,
	`units` real,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`transaction_id` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sip_plan_id`) REFERENCES `sip_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sip_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`monthly_amount` real NOT NULL,
	`sip_date` integer NOT NULL,
	`frequency` text DEFAULT 'MONTHLY' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stocks` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`symbol` text NOT NULL,
	`exchange` text DEFAULT 'NSE' NOT NULL,
	`company_name` text NOT NULL,
	`sector` text,
	`industry` text,
	`isin` text,
	`market_cap` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`triggered_by` text DEFAULT 'USER_MANUAL' NOT NULL,
	`items_updated` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`duration_ms` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`transaction_type` text NOT NULL,
	`transaction_date` text NOT NULL,
	`quantity` real NOT NULL,
	`price_or_nav` real NOT NULL,
	`amount` real NOT NULL,
	`fees` real DEFAULT 0 NOT NULL,
	`taxes` real DEFAULT 0 NOT NULL,
	`notes` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`default_currency` text DEFAULT 'INR' NOT NULL,
	`date_format` text DEFAULT 'DD/MM/YYYY' NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`email_alerts` integer DEFAULT false NOT NULL,
	`show_benchmarks` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'OWNER' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);