import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

/**
 * 클래스 요청 테이블.
 * 회원이 원하는 클래스를 신청하면 관리자가 검토 후 상태를 업데이트한다.
 */
export const classRequests = pgTable("class_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  authorNickname: text("author_nickname").notNull(),
  title: text("title").notNull(),
  level: text("level").notNull(),
  description: text("description").notNull(),
  ropeThicknessMm: integer("rope_thickness_mm"),
  ropeLengthM: integer("rope_length_m"),
  quantity: integer("quantity"),
  imageUrls: jsonb("image_urls").notNull().default([]),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("class_requests_user_id_idx").on(t.userId),
  index("class_requests_status_idx").on(t.status),
  index("class_requests_created_at_idx").on(t.createdAt),
]);
