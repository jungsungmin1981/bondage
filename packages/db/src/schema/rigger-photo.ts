import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

export const riggerPhotos = pgTable("rigger_photos", {
  id: text("id").primaryKey(),
  postId: text("post_id"),
  riggerId: text("rigger_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  visibility: text("visibility").notNull().default("public"),
  visibilityAfterApproval: text("visibility_after_approval"),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

