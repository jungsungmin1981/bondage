import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const riggerPhotos = pgTable("rigger_photos", {
  id: text("id").primaryKey(),
  postId: text("post_id"),
  riggerId: text("rigger_id").notNull(),
  userId: text("user_id").notNull(),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

