import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

/** 운영진 OTP(TOTP) 등록 완료 시크릿. 한 사용자당 1건. */
export const userTotp = pgTable("user_totp", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** OTP 등록 진행 중 임시 저장. QR 스캔 후 코드 확인 전까지 유효. */
export const otpSetupPending = pgTable("otp_setup_pending", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
