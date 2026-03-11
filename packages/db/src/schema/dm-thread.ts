import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmThreads = pgTable("dm_threads", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at"),
});

