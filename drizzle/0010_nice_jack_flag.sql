CREATE INDEX `annual_plans_userId_idx` ON `annual_plans` (`userId`);--> statement-breakpoint
CREATE INDEX `big_goals_userId_idx` ON `big_goals` (`userId`);--> statement-breakpoint
CREATE INDEX `daily_entries_userId_idx` ON `daily_entries` (`userId`);--> statement-breakpoint
CREATE INDEX `daily_entries_userId_date_idx` ON `daily_entries` (`userId`,`date`);--> statement-breakpoint
CREATE INDEX `monthly_plans_userId_idx` ON `monthly_plans` (`userId`);--> statement-breakpoint
CREATE INDEX `monthly_plans_userId_year_month_idx` ON `monthly_plans` (`userId`,`year`,`month`);--> statement-breakpoint
CREATE INDEX `note_attachments_noteId_idx` ON `note_attachments` (`noteId`);--> statement-breakpoint
CREATE INDEX `notes_userId_idx` ON `notes` (`userId`);--> statement-breakpoint
CREATE INDEX `notes_userId_folder_idx` ON `notes` (`userId`,`folder`);--> statement-breakpoint
CREATE INDEX `reminders_userId_idx` ON `reminders` (`userId`);--> statement-breakpoint
CREATE INDEX `reminders_userId_sent_idx` ON `reminders` (`userId`,`sent`);--> statement-breakpoint
CREATE INDEX `section_attachments_userId_section_idx` ON `section_attachments` (`userId`,`section`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `vision_board_images_userId_idx` ON `vision_board_images` (`userId`);--> statement-breakpoint
CREATE INDEX `weekly_plans_userId_idx` ON `weekly_plans` (`userId`);--> statement-breakpoint
CREATE INDEX `weekly_plans_userId_year_week_idx` ON `weekly_plans` (`userId`,`year`,`weekNumber`);--> statement-breakpoint
CREATE INDEX `zion_messages_userId_idx` ON `zion_messages` (`userId`);