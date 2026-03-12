import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const classChallenges = pgTable("class_challenges", {
  id: text("id").primaryKey(),
  classPostId: text("class_post_id").notNull(),
  userId: text("user_id").notNull(),
  note: text("note").notNull(),
  imageUrls: jsonb("image_urls").notNull().default([]),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
