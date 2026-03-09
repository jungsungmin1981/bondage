CREATE TABLE "rigger_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"rigger_id" text NOT NULL,
	"user_id" text NOT NULL,
	"image_path" text NOT NULL,
	"caption" text,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"photo_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"photo_id" text NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
