import { pgTable, text, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./user";

/**
 * 운영진별 관리자 메뉴 접근 권한.
 * tab_id: "operators" | "members" | "class" | "notice" | "images"
 * (인증키는 관리자 전용이라 포함하지 않음)
 */
export const operatorAdminTabs = pgTable(
  "operator_admin_tabs",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tabId: text("tab_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tabId] })],
);
