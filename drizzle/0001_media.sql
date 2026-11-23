CREATE TABLE `deck_media` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` blob NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_media_deck_name_unique` ON `deck_media` (`deck_id`,`name`);