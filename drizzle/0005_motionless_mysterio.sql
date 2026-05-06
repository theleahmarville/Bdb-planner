CREATE TABLE `note_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`noteId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileName` varchar(256) NOT NULL,
	`fileType` varchar(64) NOT NULL,
	`fileSizeBytes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `note_attachments_id` PRIMARY KEY(`id`)
);
