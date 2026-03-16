ALTER TABLE "direct_messages" ADD COLUMN IF NOT EXISTS "class_post_id" text REFERENCES "class_posts"("id") ON DELETE SET NULL;
