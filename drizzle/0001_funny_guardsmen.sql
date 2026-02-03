CREATE TABLE `round_handicaps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`round_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`course_handicap` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_round_player` ON `round_handicaps`(`round_id`, `player_id`);
--> statement-breakpoint
ALTER TABLE `scores` ADD `handicap_used` integer;
--> statement-breakpoint
UPDATE scores
SET handicap_used = (SELECT handicap FROM players WHERE players.id = scores.player_id)
WHERE handicap_used IS NULL;
--> statement-breakpoint
INSERT INTO round_handicaps (round_id, player_id, course_handicap)
SELECT DISTINCT s.round_id, s.player_id, p.handicap
FROM scores s
JOIN players p ON s.player_id = p.id
WHERE s.round_id IN (1, 2);