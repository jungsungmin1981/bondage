CREATE TABLE "bunny_board_post_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"parent_id" text,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bunny_board_post_recommends" (
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bunny_board_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"post_number" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"cover_image_url" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"scheduled_publish_at" timestamp,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bunny_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bunny_boards_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "class_challenge_approvals" (
	"challenge_id" text NOT NULL,
	"staff_user_id" text NOT NULL,
	"decision" text NOT NULL,
	"comment" text,
	"rejection_note" text,
	"rejection_image_urls" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "class_challenge_approvals_challenge_id_staff_user_id_pk" PRIMARY KEY("challenge_id","staff_user_id")
);
--> statement-breakpoint
CREATE TABLE "class_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"class_post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"note" text NOT NULL,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"rope_thickness_mm" integer NOT NULL,
	"rope_length_m" integer NOT NULL,
	"quantity" integer NOT NULL,
	"cover_image_url" text NOT NULL,
	"extra_image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"source" text,
	"class_post_id" text,
	"image_urls" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dm_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"width" text,
	"height" text
);
--> statement-breakpoint
CREATE TABLE "dm_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"sender_user_id" text NOT NULL,
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dm_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dm_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rigger_photos" ADD COLUMN "visibility_after_approval" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "card_image_url" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "rejection_note" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "re_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "bunny_board_post_comments" ADD CONSTRAINT "bunny_board_post_comments_post_id_bunny_board_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."bunny_board_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bunny_board_post_comments" ADD CONSTRAINT "bunny_board_post_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bunny_board_post_recommends" ADD CONSTRAINT "bunny_board_post_recommends_post_id_bunny_board_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."bunny_board_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bunny_board_post_recommends" ADD CONSTRAINT "bunny_board_post_recommends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bunny_board_posts" ADD CONSTRAINT "bunny_board_posts_board_id_bunny_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."bunny_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bunny_board_posts" ADD CONSTRAINT "bunny_board_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bunny_board_posts" ADD CONSTRAINT "bunny_board_posts_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_challenge_approvals" ADD CONSTRAINT "class_challenge_approvals_challenge_id_class_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."class_challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_class_post_id_class_posts_id_fk" FOREIGN KEY ("class_post_id") REFERENCES "public"."class_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_attachments" ADD CONSTRAINT "dm_attachments_message_id_dm_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."dm_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_thread_id_dm_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."dm_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_participants" ADD CONSTRAINT "dm_participants_thread_id_dm_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."dm_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_participants" ADD CONSTRAINT "dm_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bunny_board_post_recommends_post_user_idx" ON "bunny_board_post_recommends" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bunny_board_posts_board_post_number_idx" ON "bunny_board_posts" USING btree ("board_id","post_number");--> statement-breakpoint
CREATE INDEX "direct_messages_to_user_id_created_at_idx" ON "direct_messages" USING btree ("to_user_id","created_at");--> statement-breakpoint
CREATE INDEX "direct_messages_from_user_id_created_at_idx" ON "direct_messages" USING btree ("from_user_id","created_at");--> statement-breakpoint
CREATE INDEX "dm_attachments_message_id_idx" ON "dm_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "dm_messages_thread_created_at_idx" ON "dm_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dm_participants_thread_user_idx" ON "dm_participants" USING btree ("thread_id","user_id");--> statement-breakpoint
CREATE INDEX "dm_participants_user_thread_idx" ON "dm_participants" USING btree ("user_id","thread_id");