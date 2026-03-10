ALTER TABLE "rigger_photos"
ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;

