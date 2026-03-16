import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  /** 로그인 아이디 (better-auth username 플러그인) */
  username: text("username").unique(),
  /** 로그인 아이디 표시용 (정규화 전 원본) */
  displayUsername: text("display_username"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  /** 회원 구분: 리거/버니 선택 시 세션에 노출되어 미들웨어에서 사용 */
  memberType: text("member_type"), // "rigger" | "bunny"
  /** 가입 시 사용한 인증키 id (invite_keys.id) */
  inviteKeyId: text("invite_key_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

