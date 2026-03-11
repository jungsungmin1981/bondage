import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const riggerPhotos = pgTable("rigger_photos", {
  id: text("id").primaryKey(),
  postId: text("post_id"),
  riggerId: text("rigger_id").notNull(),
  userId: text("user_id").notNull(),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  /** 공개/비공개 (post 단위로 동일 값) */
  visibility: text("visibility").notNull().default("public"),
  /** 버니 포함 게시물: 승인 완료 후 적용할 공개/비공개 (리거가 등록 시 선택한 값). null이면 승인 시 public */
  visibilityAfterApproval: text("visibility_after_approval"),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

