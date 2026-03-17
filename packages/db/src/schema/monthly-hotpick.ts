import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./user";

/** 월간 핫픽 접수. 월·유저당 1장, 사진만(제목 없음). */
export const monthlyHotpickSubmissions = pgTable(
  "monthly_hotpick_submissions",
  {
    id: text("id").primaryKey(),
    /** 월의 첫날 (YYYY-MM-01) */
    month: text("month").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** 마지막 수정일. 등록 시에는 createdAt과 동일, 사진 변경 시 갱신. */
    updatedAt: timestamp("updated_at"),
  },
  (t) => [unique().on(t.month, t.userId)],
);

/** 월간 핫픽 투표. 한 유저가 한 submission에 1표만. */
export const monthlyHotpickVotes = pgTable(
  "monthly_hotpick_votes",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => monthlyHotpickSubmissions.id, { onDelete: "cascade" }),
    voterUserId: text("voter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.submissionId, t.voterUserId)],
);
