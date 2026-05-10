ALTER TABLE `users` ADD COLUMN `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `bio` varchar(280);--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `timezone` varchar(64) DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `onboardingCompleted` boolean NOT NULL DEFAULT false;
