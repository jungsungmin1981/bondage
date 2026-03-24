CREATE TABLE "bunny_photo_likes" (
  "id" text PRIMARY KEY NOT NULL,
  "photo_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "bunny_photo_likes" ADD CONSTRAINT "bunny_photo_likes_photo_id_bunny_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."bunny_photos"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bunny_photo_likes" ADD CONSTRAINT "bunny_photo_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "bunny_photo_likes_photo_user_idx" ON "bunny_photo_likes" USING btree ("photo_id","user_id");
