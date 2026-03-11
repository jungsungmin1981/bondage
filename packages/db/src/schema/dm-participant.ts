import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./user";
import { dmThreads } from "./dm-thread";

export const dmParticipants = pgTable(
  "dm_participants",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => dmThreads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    lastReadAt: timestamp("last_read_at"),
  },
  (table) => [
    uniqueIndex("dm_participants_thread_user_idx").on(table.threadId, table.userId),
    index("dm_participants_user_thread_idx").on(table.userId, table.threadId),
  ],
);

