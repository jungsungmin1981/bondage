import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

export const directMessages = pgTable(
  "direct_messages",
  {
    id: text("id").primaryKey(),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("direct_messages_to_user_id_created_at_idx").on(
      table.toUserId,
      table.createdAt,
    ),
    index("direct_messages_from_user_id_created_at_idx").on(
      table.fromUserId,
      table.createdAt,
    ),
  ],
);

