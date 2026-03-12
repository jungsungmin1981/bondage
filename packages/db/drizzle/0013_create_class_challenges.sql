CREATE TABLE IF NOT EXISTS "class_challenges" (
  "id" text PRIMARY KEY NOT NULL,
  "class_post_id" text NOT NULL,
  "user_id" text NOT NULL,
  "note" text NOT NULL,
  "image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "class_challenges_class_post_id_idx" ON "class_challenges" ("class_post_id");
CREATE INDEX IF NOT EXISTS "class_challenges_user_id_idx" ON "class_challenges" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "class_challenges_user_post_unique" ON "class_challenges" ("user_id", "class_post_id");
