import { boolean, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./user";

export const bunnyBoards = pgTable("bunny_boards", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bunnyBoardPosts = pgTable(
  "bunny_board_posts",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => bunnyBoards.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 게시판 내 추적용 순번 (1, 2, 3...) */
    postNumber: integer("post_number").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** 대표 이미지 URL (공지 등) */
    coverImageUrl: text("cover_image_url"),
    /** 공개 여부 (공지 등: false면 목록/상세 비공개) */
    isPublished: boolean("is_published").default(true).notNull(),
    /** 예약 공개 시각 (null이면 즉시 공개/비공개, 미래 시각이면 해당 시각에 공개) */
    scheduledPublishAt: timestamp("scheduled_publish_at"),
    /** 목록 정렬 순서 (작을수록 위). 관리자 Q&A 등에서 사용 */
    sortOrder: integer("sort_order").default(0).notNull(),
    /** 마지막 수정자 (관리자 수정 시 저장) */
    updatedByUserId: text("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bunny_board_posts_board_post_number_idx").on(
      table.boardId,
      table.postNumber,
    ),
  ],
);

/** 글별 추천 (회원당 1회). post_id + user_id unique */
export const bunnyBoardPostRecommends = pgTable(
  "bunny_board_post_recommends",
  {
    postId: text("post_id")
      .notNull()
      .references(() => bunnyBoardPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bunny_board_post_recommends_post_user_idx").on(
      table.postId,
      table.userId,
    ),
  ],
);
