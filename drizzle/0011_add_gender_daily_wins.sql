ALTER TABLE `users` ADD COLUMN `gender` enum('female','male','other') DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `daily_entries` ADD COLUMN `dailyWins` json;
