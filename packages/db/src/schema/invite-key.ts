import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * 회원가입 인증키. 리거 발급(rigger_id) 또는 관리자 발급(rigger_id null, member_type 'operator').
 * 만료·사용 여부 검증 후 회원가입에 사용됨.
 */
export const inviteKeys = pgTable("invite_keys", {
  id: text("id").primaryKey(),
  /** 발급된 키 문자열 (복사용 URL에 포함) */
  key: text("key").notNull().unique(),
  /** 발급한 리거 user id. 운영자 키는 관리자 전용 API에서만 발급하므로 null */
  riggerId: text("rigger_id"),
  /** 관리자/운영진 API로 발급 시 발급한 user id. 미사용 키 조회용 */
  createdByUserId: text("created_by_user_id"),
  /** 키 종류: 리거용 | 버니용 | 운영자용. 가입 후 member_type 설정 및 리다이렉트에 사용 */
  memberType: text("member_type"), // "rigger" | "bunny" | "operator" | null(레거시)
  /** 만료 시각 */
  expiresAt: timestamp("expires_at").notNull(),
  /** 사용된 시각 (null이면 미사용) */
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
