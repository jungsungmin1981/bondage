import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * 리거 등급별 별(star) 획득 조건.
 * starIndex: 이 조건이 달성되면 추가되는 별 번호 (1~5).
 * conditionType: "first_post" | "total_likes" | "class_clear_rate"
 * threshold: 조건 달성 기준값 (first_post는 항상 1)
 */
export const tierConditions = pgTable(
  "tier_conditions",
  {
    id: text("id").primaryKey(),
    tier: text("tier").notNull().default("bronze"),
    conditionType: text("condition_type").notNull(),
    threshold: integer("threshold").notNull().default(0),
    starIndex: integer("star_index").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("tier_conditions_tier_idx").on(t.tier),
    index("tier_conditions_star_index_idx").on(t.starIndex),
  ],
);
