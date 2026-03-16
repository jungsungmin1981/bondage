import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const bunnyPhotos = pgTable("bunny_photos", {
  id: text("id").primaryKey(),
  bunnyProfileId: text("bunny_profile_id").notNull(),
  userId: text("user_id").notNull(),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
