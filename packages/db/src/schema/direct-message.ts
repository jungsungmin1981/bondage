import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";
import { classPosts } from "./class-post";

export const directMessages = pgTable(
  "direct_messages",
  {
    id: text("id").primaryKey(),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 쪽지 제목 (선택) */
    title: text("title"),
    body: text("body").notNull(),
    /** 출처 구분: rigger_rejection, bunny_rejection 등 */
    source: text("source"),
    /** 클래스 도전 반려 시 해당 클래스 게시물 id (레벨·게시물명 표시용) */
    classPostId: text("class_post_id").references(() => classPosts.id, {
      onDelete: "set null",
    }),
    /** 첨부 이미지 URL 목록 (클래스 도전 반려 시 참고 이미지 등) */
    imageUrls: jsonb("image_urls").$type<string[]>(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("direct_messages_to_user_id_created_at_idx").on(
      table.toUserId,
      table.createdAt,
    ),
    index("direct_messages_from_user_id_created_at_idx").on(
      table.fromUserId,
      table.createdAt,
    ),
  ],
);

