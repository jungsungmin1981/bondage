import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./user";

export const memberProfiles = pgTable(
  "member_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    memberType: text("member_type").notNull(), // "rigger" | "bunny"
    nickname: text("nickname").notNull(),
    iconUrl: text("icon_url"),
    bio: text("bio"),
    cardImageUrl: text("card_image_url"), // 버니 전용 카드 이미지 URL
    gender: text("gender"), // "남" | "여" | "기타" 등
    // 상세 프로필 (정보수정 시 입력, 리거/버니 공통·리거 전용 혼용)
    division: text("division"), // 리거 전용: "리거" | "리거 & 버니"
    bunnyRecruit: text("bunny_recruit"), // 리거 전용: "Yes" | "No"
    bondageRating: text("bondage_rating"), // 리거 전용: "Yes" | "No"
    activityRegion: text("activity_region"),
    style: text("style"), // 쉼표 구분 복수 스타일
    status: text("status").notNull(), // "pending" | "approved" | "rejected"
    rejectionNote: text("rejection_note"), // 리거 반려 시 보낸 쪽지 내용
    reRequestedAt: timestamp("re_requested_at"), // 반려 후 재승인 요청한 시각 (null = 처음 승인 대기)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("member_profiles_user_id_idx").on(table.userId),
    index("member_profiles_member_type_idx").on(table.memberType),
    index("member_profiles_status_idx").on(table.status),
  ],
);
