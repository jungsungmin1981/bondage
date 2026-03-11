import { index, pgTable, text } from "drizzle-orm/pg-core";
import { dmMessages } from "./dm-message";

export const dmAttachments = pgTable(
  "dm_attachments",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => dmMessages.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "image"
    url: text("url").notNull(),
    width: text("width"),
    height: text("height"),
  },
  (table) => [index("dm_attachments_message_id_idx").on(table.messageId)],
);

