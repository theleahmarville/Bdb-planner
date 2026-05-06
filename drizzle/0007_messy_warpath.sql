CREATE TABLE `night_reflections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`category1` varchar(128),
	`desire1` text,
	`category2` varchar(128),
	`desire2` text,
	`category3` varchar(128),
	`desire3` text,
	`negativeThought` text,
	`reframe` text,
	`zionMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `night_reflections_id` PRIMARY KEY(`id`)
);
