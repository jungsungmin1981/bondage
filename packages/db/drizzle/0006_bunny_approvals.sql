CREATE TABLE "bunny_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"bunny_user_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bunny_approvals_post_bunny_idx" ON "bunny_approvals" ("post_id","bunny_user_id");
--> statement-breakpoint
CREATE INDEX "bunny_approvals_bunny_user_id_idx" ON "bunny_approvals" ("bunny_user_id");
