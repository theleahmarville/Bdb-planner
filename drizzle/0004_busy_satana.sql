CREATE TABLE `section_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`section` varchar(64) NOT NULL,
	`sectionKey` varchar(128) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileName` varchar(256) NOT NULL,
	`fileType` varchar(64) NOT NULL,
	`fileSizeBytes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `section_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` varchar(32) NOT NULL,
	`handle` varchar(128),
	`profileUrl` varchar(512),
	`displayName` varchar(128),
	`followerCount` int,
	`connected` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vision_board_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`year` int NOT NULL,
	`imageUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`caption` varchar(256) DEFAULT '',
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vision_board_images_id` PRIMARY KEY(`id`)
);
