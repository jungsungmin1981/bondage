import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";
import { dmThreads } from "./dm-thread";

export const dmMessages = pgTable(
  "dm_messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => dmThreads.id, { onDelete: "cascade" }),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("dm_messages_thread_created_at_idx").on(table.threadId, table.createdAt),
  ],
);

