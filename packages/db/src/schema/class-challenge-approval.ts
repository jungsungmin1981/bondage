import { jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { classChallenges } from "./class-challenge";
import { users } from "./user";

export const classChallengeApprovals = pgTable(
  "class_challenge_approvals",
  {
    challengeId: text("challenge_id")
      .notNull()
      .references(() => classChallenges.id, { onDelete: "cascade" }),
    staffUserId: text("staff_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    decision: text("decision").notNull(), // "approved" | "rejected"
    /** 승인 시 리거에게 보여줄 코멘트 */
    comment: text("comment"),
    /** 반려 시 사유(설명) */
    rejectionNote: text("rejection_note"),
    /** 반려 시 참고 이미지 URL 목록 */
    rejectionImageUrls: jsonb("rejection_image_urls").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.challengeId, table.staffUserId] }),
  ],
);
