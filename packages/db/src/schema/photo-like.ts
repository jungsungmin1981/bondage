import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const photoLikes = pgTable("photo_likes", {
  id: text("id").primaryKey(),
  photoId: text("photo_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

