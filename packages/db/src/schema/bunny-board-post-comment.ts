import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";
import { bunnyBoardPosts } from "./bunny-board";

/** parent_id는 self-FK. 스키마에서는 참조 생략, ensure 스크립트에서 FK 추가 */
export const bunnyBoardPostComments = pgTable(
  "bunny_board_post_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => bunnyBoardPosts.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** soft delete: 값이 있으면 삭제된 댓글, UI에서 "삭제된 댓글입니다" 표시 */
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);
