import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./user";

export const memberProfiles = pgTable(
  "member_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    memberType: text("member_type").notNull(),
    nickname: text("nickname").notNull(),
    iconUrl: text("icon_url"),
    bio: text("bio"),
    cardImageUrl: text("card_image_url"),
    gender: text("gender"),
    division: text("division"),
    bunnyRecruit: text("bunny_recruit"),
    bondageRating: text("bondage_rating"),
    activityRegion: text("activity_region"),
    style: text("style"),
    markImageUrl: text("mark_image_url"),
    profileVisibility: text("profile_visibility"),
    status: text("status").notNull(),
    rejectionNote: text("rejection_note"),
    reRequestedAt: timestamp("re_requested_at"),
    /** 리거 전용: 현재 등급 (bronze | silver | gold | legend) */
    tier: text("tier").notNull().default("bronze"),
    /** 리거 전용: 현재 등급 내 별 수 (1~5) */
    stars: integer("stars").notNull().default(0),
    /** 리거 전용: 관리자가 수동으로 tier/stars를 변경한 경우 true */
    tierManualOverride: boolean("tier_manual_override").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("member_profiles_user_id_idx").on(table.userId),
    index("member_profiles_member_type_idx").on(table.memberType),
    index("member_profiles_status_idx").on(table.status),
  ],
);
