import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

export const bunnyPhotos = pgTable("bunny_photos", {
  id: text("id").primaryKey(),
  postId: text("post_id"),
  bunnyProfileId: text("bunny_profile_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
