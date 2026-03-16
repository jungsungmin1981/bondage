import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * 리거가 발급한 회원가입 인증키.
 * 만료·사용 여부 검증 후 회원가입에 사용됨.
 */
export const inviteKeys = pgTable("invite_keys", {
  id: text("id").primaryKey(),
  /** 발급된 키 문자열 (복사용 URL에 포함) */
  key: text("key").notNull().unique(),
  /** 발급한 리거 user id */
  riggerId: text("rigger_id").notNull(),
  /** 키 종류: 리거용 | 버니용. 가입 후 온보딩 없을 때 이 값으로 리거/버니 폼으로 자동 이동 */
  memberType: text("member_type"), // "rigger" | "bunny" | null(레거시)
  /** 만료 시각 */
  expiresAt: timestamp("expires_at").notNull(),
  /** 사용된 시각 (null이면 미사용) */
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
