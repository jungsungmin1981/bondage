CREATE TABLE "bunny_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"bunny_user_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"member_type" text NOT NULL,
	"nickname" text NOT NULL,
	"icon_url" text,
	"bio" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bunny_approvals_post_bunny_idx" ON "bunny_approvals" USING btree ("post_id","bunny_user_id");--> statement-breakpoint
CREATE INDEX "bunny_approvals_bunny_user_id_idx" ON "bunny_approvals" USING btree ("bunny_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_profiles_user_id_idx" ON "member_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_profiles_member_type_idx" ON "member_profiles" USING btree ("member_type");--> statement-breakpoint
CREATE INDEX "member_profiles_status_idx" ON "member_profiles" USING btree ("status");