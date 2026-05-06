ALTER TABLE `notes` ADD `isLocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `lockPasswordHash` text;