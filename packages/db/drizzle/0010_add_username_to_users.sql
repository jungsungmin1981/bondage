ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_username" text;
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");
