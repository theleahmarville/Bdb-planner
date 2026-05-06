CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(512) NOT NULL DEFAULT 'Untitled',
	`content` text NOT NULL DEFAULT (''),
	`folder` varchar(128) NOT NULL DEFAULT 'All Notes',
	`pinned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`reminderAt` timestamp NOT NULL,
	`date` varchar(10) NOT NULL,
	`timeSlot` varchar(5),
	`notifyBrowser` boolean NOT NULL DEFAULT true,
	`notifySlack` boolean NOT NULL DEFAULT false,
	`sent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slackWebhookUrl` text,
	`slackChannelName` varchar(128),
	`googleAccessToken` text,
	`googleRefreshToken` text,
	`googleTokenExpiry` timestamp,
	`googleCalendarId` varchar(256),
	`notionToken` text,
	`notionDatabaseId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_integrations_userId_unique` UNIQUE(`userId`)
);
