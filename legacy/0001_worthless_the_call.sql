CREATE TABLE `dram_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item` varchar(255) NOT NULL,
	`daily_high` int NOT NULL,
	`daily_low` int NOT NULL,
	`session_high` int NOT NULL,
	`session_low` int NOT NULL,
	`session_average` int NOT NULL,
	`session_change` int NOT NULL,
	`category` enum('DDR5','DDR4','DDR3') NOT NULL,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dram_prices_id` PRIMARY KEY(`id`)
);
