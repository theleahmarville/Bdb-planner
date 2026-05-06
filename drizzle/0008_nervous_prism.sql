CREATE TABLE `daily_devotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`verse` text NOT NULL,
	`verseRef` varchar(128) NOT NULL,
	`affirmation` text NOT NULL,
	`theme` varchar(128),
	`dismissed` boolean NOT NULL DEFAULT false,
	`savedToPlanner` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_devotions_id` PRIMARY KEY(`id`)
);
