import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const postLikes = pgTable(
  "post_likes",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("post_likes_post_user_idx").on(t.postId, t.userId)],
);
