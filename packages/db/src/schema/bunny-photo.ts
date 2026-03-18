import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

export const bunnyPhotos = pgTable("bunny_photos", {
  id: text("id").primaryKey(),
  bunnyProfileId: text("bunny_profile_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
