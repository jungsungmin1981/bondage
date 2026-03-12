CREATE TABLE IF NOT EXISTS "class_posts" (
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

CREATE INDEX IF NOT EXISTS "class_posts_level_idx" ON "class_posts" ("level");
CREATE INDEX IF NOT EXISTS "class_posts_visibility_idx" ON "class_posts" ("visibility");

