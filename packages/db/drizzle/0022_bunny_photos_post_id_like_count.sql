ALTER TABLE "bunny_photos" ADD COLUMN "post_id" text;
ALTER TABLE "bunny_photos" ADD COLUMN "like_count" integer NOT NULL DEFAULT 0;
