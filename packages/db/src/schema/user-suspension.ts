import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

/**
 * 이용제한(정지). 관리자가 회원을 정지할 때 사용.
 * suspended_until이 null이면 영구 정지.
 */
export const userSuspensions = pgTable("user_suspensions", {
  id: text("id").primaryKey(),
  /** 정지 대상 user id */
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** 정지 해제 시각. null이면 영구 정지 */
  suspendedUntil: timestamp("suspended_until"),
  /** 사유 (선택) */
  reason: text("reason"),
  /** 정지한 관리자 user id */
  createdByUserId: text("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
