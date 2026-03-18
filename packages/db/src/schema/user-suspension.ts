import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

/**
 * 이용제한(정지). 관리자가 회원을 정지할 때 사용.
 * suspended_until이 null이면 영구 정지.
 */
export const userSuspensions = pgTable("user_suspensions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  suspendedUntil: timestamp("suspended_until"),
  reason: text("reason"),
  createdByUserId: text("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("user_suspensions_user_id_idx").on(t.userId),
]);
