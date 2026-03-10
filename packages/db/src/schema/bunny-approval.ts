import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const bunnyApprovals = pgTable(
  "bunny_approvals",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    bunnyUserId: text("bunny_user_id").notNull(),
    status: text("status").notNull(), // "pending" | "approved" | "rejected"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bunny_approvals_post_bunny_idx").on(
      table.postId,
      table.bunnyUserId,
    ),
    index("bunny_approvals_bunny_user_id_idx").on(table.bunnyUserId),
  ],
);
