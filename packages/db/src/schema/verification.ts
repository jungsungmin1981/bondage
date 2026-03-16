import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * better-auth 인증용 (비밀번호 재설정, 이메일 인증 등) 토큰 저장.
 * @see https://www.better-auth.com/docs/concepts/database#verification
 */
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
