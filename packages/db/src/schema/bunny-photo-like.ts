import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./user";
import { bunnyPhotos } from "./bunny-photo";

export const bunnyPhotoLikes = pgTable("bunny_photo_likes", {
  id: text("id").primaryKey(),
  photoId: text("photo_id").notNull().references(() => bunnyPhotos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("bunny_photo_likes_photo_user_idx").on(t.photoId, t.userId),
]);
