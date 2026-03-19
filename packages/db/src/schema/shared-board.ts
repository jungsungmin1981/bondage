import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const sharedBoards = pgTable("shared_boards", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sharedBoardPosts = pgTable(
  "shared_board_posts",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => sharedBoards.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postNumber: integer("post_number").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    coverImageUrl: text("cover_image_url"),
    isPublished: boolean("is_published").default(true).notNull(),
    scheduledPublishAt: timestamp("scheduled_publish_at"),
    /** 목록 정렬 순서 (작을수록 위). 관리자 Q&A 등에서 사용 */
    sortOrder: integer("sort_order").default(0).notNull(),
    /** 조회수 */
    viewCount: integer("view_count").default(0).notNull(),
    updatedByUserId: text("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shared_board_posts_board_post_number_idx").on(
      table.boardId,
      table.postNumber,
    ),
  ],
);

export const sharedBoardPostRecommends = pgTable(
  "shared_board_post_recommends",
  {
    postId: text("post_id")
      .notNull()
      .references(() => sharedBoardPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shared_board_post_recommends_post_user_idx").on(
      table.postId,
      table.userId,
    ),
  ],
);
