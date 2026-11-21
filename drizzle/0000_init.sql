CREATE TABLE `brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`website` text,
	`is_custom` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_name_unique` ON `brands` (`name`);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`family` text NOT NULL,
	`is_custom` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `materials_name_unique` ON `materials` (`name`);
--> statement-breakpoint
CREATE TABLE `colors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`hex` text NOT NULL,
	`brand_id` integer,
	`material_id` integer,
	`extruder_temp` integer,
	`extruder_temp_min` integer,
	`extruder_temp_max` integer,
	`is_custom` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`),
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`)
);
--> statement-breakpoint
CREATE INDEX `colors_brand_material_idx` ON `colors` (`brand_id`, `material_id`);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` integer NOT NULL,
	`material_id` integer NOT NULL,
	`color_id` integer NOT NULL,
	`roll_weight_g` integer DEFAULT 1000 NOT NULL,
	`roll_count` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`),
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`),
	FOREIGN KEY (`color_id`) REFERENCES `colors`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_combo_idx` ON `inventory_items` (`brand_id`, `material_id`, `color_id`, `roll_weight_g`);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);
