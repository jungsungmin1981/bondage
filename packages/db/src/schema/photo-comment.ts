import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const photoComments = pgTable("photo_comments", {
  id: text("id").primaryKey(),
  photoId: text("photo_id").notNull(),
  userId: text("user_id").notNull(),
  parentId: text("parent_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

