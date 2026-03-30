import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

/**
 * 회원가입 인증키. 리거 발급(rigger_id) 또는 관리자 발급(rigger_id null, member_type 'operator').
 * 만료·사용 여부 검증 후 회원가입에 사용됨.
 * maxUses: null이면 1회용(기존 동작), 숫자면 해당 횟수만큼 재사용 가능.
 * usedCount: 실제 사용된 횟수.
 */
export const inviteKeys = pgTable("invite_keys", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  riggerId: text("rigger_id").references(() => users.id),
  createdByUserId: text("created_by_user_id").references(() => users.id),
  memberType: text("member_type"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("invite_keys_created_by_user_id_idx").on(t.createdByUserId),
  index("invite_keys_rigger_id_idx").on(t.riggerId),
]);
