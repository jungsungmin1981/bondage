import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { classPosts } from "./class-post";
import { users } from "./user";

export const classChallenges = pgTable("class_challenges", {
  id: text("id").primaryKey(),
  classPostId: text("class_post_id").notNull().references(() => classPosts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  imageUrls: jsonb("image_urls").notNull().default([]),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("class_challenges_class_post_id_idx").on(t.classPostId),
  index("class_challenges_user_id_idx").on(t.userId),
  index("class_challenges_status_idx").on(t.status),
]);
