CREATE TABLE "otp_setup_pending" (
	"user_id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_totp" (
	"user_id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operator_admin_tabs" (
	"user_id" text NOT NULL,
	"tab_id" text NOT NULL,
	CONSTRAINT "operator_admin_tabs_user_id_tab_id_pk" PRIMARY KEY("user_id","tab_id")
);
--> statement-breakpoint
ALTER TABLE "invite_keys" ALTER COLUMN "rigger_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bunny_board_posts" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "mark_image_url" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "profile_visibility" text;--> statement-breakpoint
ALTER TABLE "shared_board_posts" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invite_keys" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "otp_setup_pending" ADD CONSTRAINT "otp_setup_pending_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_totp" ADD CONSTRAINT "user_totp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operator_admin_tabs" ADD CONSTRAINT "operator_admin_tabs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bunny_photos" ADD CONSTRAINT "bunny_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_challenge_approvals" ADD CONSTRAINT "class_challenge_approvals_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_challenges" ADD CONSTRAINT "class_challenges_class_post_id_class_posts_id_fk" FOREIGN KEY ("class_post_id") REFERENCES "public"."class_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_challenges" ADD CONSTRAINT "class_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigger_photos" ADD CONSTRAINT "rigger_photos_rigger_id_users_id_fk" FOREIGN KEY ("rigger_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigger_photos" ADD CONSTRAINT "rigger_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_likes" ADD CONSTRAINT "photo_likes_photo_id_rigger_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."rigger_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_likes" ADD CONSTRAINT "photo_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_comments" ADD CONSTRAINT "photo_comments_photo_id_rigger_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."rigger_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_comments" ADD CONSTRAINT "photo_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_keys" ADD CONSTRAINT "invite_keys_rigger_id_users_id_fk" FOREIGN KEY ("rigger_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_keys" ADD CONSTRAINT "invite_keys_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_challenges_class_post_id_idx" ON "class_challenges" USING btree ("class_post_id");--> statement-breakpoint
CREATE INDEX "class_challenges_user_id_idx" ON "class_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "class_challenges_status_idx" ON "class_challenges" USING btree ("status");--> statement-breakpoint
CREATE INDEX "class_posts_level_visibility_idx" ON "class_posts" USING btree ("level","visibility");--> statement-breakpoint
CREATE INDEX "dm_threads_last_message_at_idx" ON "dm_threads" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photo_likes_photo_user_idx" ON "photo_likes" USING btree ("photo_id","user_id");--> statement-breakpoint
CREATE INDEX "photo_comments_photo_id_idx" ON "photo_comments" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "photo_comments_parent_id_idx" ON "photo_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "invite_keys_created_by_user_id_idx" ON "invite_keys" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "invite_keys_rigger_id_idx" ON "invite_keys" USING btree ("rigger_id");--> statement-breakpoint
CREATE INDEX "user_suspensions_user_id_idx" ON "user_suspensions" USING btree ("user_id");