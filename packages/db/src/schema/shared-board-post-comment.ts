import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";
import { sharedBoardPosts } from "./shared-board";

export const sharedBoardPostComments = pgTable(
  "shared_board_post_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => sharedBoardPosts.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);
