import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const classPosts = pgTable("class_posts", {
  id: text("id").primaryKey(),
  level: text("level").notNull(),
  visibility: text("visibility").notNull().default("private"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  ropeThicknessMm: integer("rope_thickness_mm").notNull(),
  ropeLengthM: integer("rope_length_m").notNull(),
  quantity: integer("quantity").notNull(),
  coverImageUrl: text("cover_image_url").notNull(),
  extraImageUrls: jsonb("extra_image_urls").notNull().default([]),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("class_posts_level_visibility_idx").on(t.level, t.visibility),
]);

