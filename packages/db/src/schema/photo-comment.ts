import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";
import { riggerPhotos } from "./rigger-photo";

export const photoComments = pgTable("photo_comments", {
  id: text("id").primaryKey(),
  photoId: text("photo_id").notNull().references(() => riggerPhotos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("photo_comments_photo_id_idx").on(t.photoId),
  index("photo_comments_parent_id_idx").on(t.parentId),
]);

