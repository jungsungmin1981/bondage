import { and, asc, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type SubmissionRow = {
  id: string;
  month: string;
  userId: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt?: Date | null;
};

/** 월간 핫픽 접수 1건 등록. 1인 1장 제한은 호출 전 검사. */
export async function insertMonthlyHotpickSubmission(params: {
  id: string;
  month: string;
  userId: string;
  imageUrl: string;
}): Promise<SubmissionRow> {
  const now = new Date();
  const [row] = await db
    .insert(schema.monthlyHotpickSubmissions)
    .values({
      id: params.id,
      month: params.month,
      userId: params.userId,
      imageUrl: params.imageUrl,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new Error("insert failed");
  return {
    id: row.id,
    month: row.month,
    userId: row.userId,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? undefined,
  };
}

/** 해당 월에 해당 유저가 이미 제출했는지 조회. */
export async function getSubmissionByUserAndMonth(
  month: string,
  userId: string,
): Promise<SubmissionRow | null> {
  const [row] = await db
    .select()
    .from(schema.monthlyHotpickSubmissions)
    .where(
      and(
        eq(schema.monthlyHotpickSubmissions.month, month),
        eq(schema.monthlyHotpickSubmissions.userId, userId),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    month: row.month,
    userId: row.userId,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? undefined,
  };
}

/** 본인 제출 건의 이미지 URL만 갱신. (id + userId 일치 시에만) */
export async function updateMonthlyHotpickSubmissionImage(
  submissionId: string,
  userId: string,
  imageUrl: string,
): Promise<boolean> {
  const updated = await db
    .update(schema.monthlyHotpickSubmissions)
    .set({ imageUrl, updatedAt: new Date() })
    .where(
      and(
        eq(schema.monthlyHotpickSubmissions.id, submissionId),
        eq(schema.monthlyHotpickSubmissions.userId, userId),
      ),
    )
    .returning({ id: schema.monthlyHotpickSubmissions.id });
  return updated.length > 0;
}

/** 본인 제출 건 삭제(참가 취소). (id + userId 일치 시에만) */
export async function deleteMonthlyHotpickSubmission(
  submissionId: string,
  userId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(schema.monthlyHotpickSubmissions)
    .where(
      and(
        eq(schema.monthlyHotpickSubmissions.id, submissionId),
        eq(schema.monthlyHotpickSubmissions.userId, userId),
      ),
    )
    .returning({ id: schema.monthlyHotpickSubmissions.id });
  return deleted.length > 0;
}

export type SubmissionWithUserId = SubmissionRow;

/** 해당 월 접수 건수. */
export async function getMonthlyHotpickSubmissionCount(
  month: string,
): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.monthlyHotpickSubmissions)
    .where(eq(schema.monthlyHotpickSubmissions.month, month));
  return count ?? 0;
}

/** 해당 월 접수 목록 최신순 limit건. (등록·수정일 기준: COALESCE(updated_at, created_at) DESC) */
export async function getMonthlyHotpickSubmissionsLatest(
  month: string,
  limit: number,
): Promise<SubmissionWithUserId[]> {
  const t = schema.monthlyHotpickSubmissions;
  const rows = await db
    .select()
    .from(t)
    .where(eq(t.month, month))
    .orderBy(sql`COALESCE(${t.updatedAt}, ${t.createdAt}) DESC`)
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    month: r.month,
    userId: r.userId,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? undefined,
  }));
}

/** 해당 월 접수 목록 페이징 (등록일 오름차순). */
export async function getMonthlyHotpickSubmissionsPage(
  month: string,
  offset: number,
  limit: number,
): Promise<{ items: SubmissionWithUserId[]; totalCount: number }> {
  const items = await db
    .select()
    .from(schema.monthlyHotpickSubmissions)
    .where(eq(schema.monthlyHotpickSubmissions.month, month))
    .orderBy(asc(schema.monthlyHotpickSubmissions.createdAt))
    .offset(offset)
    .limit(limit);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.monthlyHotpickSubmissions)
    .where(eq(schema.monthlyHotpickSubmissions.month, month));

  return {
    items: items.map((r) => ({
      id: r.id,
      month: r.month,
      userId: r.userId,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt,
    })),
    totalCount: count ?? 0,
  };
}

/** 투표 1건 등록. unique 제약으로 중복 투표 방지. */
export async function insertMonthlyHotpickVote(params: {
  id: string;
  submissionId: string;
  voterUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await db.insert(schema.monthlyHotpickVotes).values({
      id: params.id,
      submissionId: params.submissionId,
      voterUserId: params.voterUserId,
    });
    return { ok: true };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      return { ok: false, error: "이미 투표한 사진입니다." };
    }
    throw e;
  }
}

/** 해당 월에서 이 유저가 아직 투표하지 않은 submission id 목록 (최대 limit개). */
export async function getSubmissionIdsNotVotedByUser(
  month: string,
  voterUserId: string,
  limit: number,
): Promise<string[]> {
  const voted = await db
    .select({ submissionId: schema.monthlyHotpickVotes.submissionId })
    .from(schema.monthlyHotpickVotes)
    .innerJoin(
      schema.monthlyHotpickSubmissions,
      eq(schema.monthlyHotpickVotes.submissionId, schema.monthlyHotpickSubmissions.id),
    )
    .where(
      and(
        eq(schema.monthlyHotpickSubmissions.month, month),
        eq(schema.monthlyHotpickVotes.voterUserId, voterUserId),
      ),
    );

  const votedIds = voted.map((r) => r.submissionId);
  if (votedIds.length === 0) {
    const all = await db
      .select({ id: schema.monthlyHotpickSubmissions.id })
      .from(schema.monthlyHotpickSubmissions)
      .where(eq(schema.monthlyHotpickSubmissions.month, month))
      .orderBy(asc(schema.monthlyHotpickSubmissions.createdAt))
      .limit(limit);
    return all.map((r) => r.id);
  }

  const notVoted = await db
    .select({ id: schema.monthlyHotpickSubmissions.id })
    .from(schema.monthlyHotpickSubmissions)
    .where(
      and(
        eq(schema.monthlyHotpickSubmissions.month, month),
        notInArray(schema.monthlyHotpickSubmissions.id, votedIds),
      ),
    )
    .orderBy(asc(schema.monthlyHotpickSubmissions.createdAt))
    .limit(limit);

  return notVoted.map((r) => r.id);
}

/** 해당 월에서 이 유저가 아직 투표하지 않은 submission id 목록 전체 (limit 없음). */
/** 해당 월에 등록된 submission id 목록 전체 (투표 여부 무관). */
export async function getAllSubmissionIdsForMonth(
  month: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: schema.monthlyHotpickSubmissions.id })
    .from(schema.monthlyHotpickSubmissions)
    .where(eq(schema.monthlyHotpickSubmissions.month, month))
    .orderBy(asc(schema.monthlyHotpickSubmissions.createdAt));
  return rows.map((r) => r.id);
}

/** 해당 월에 이 유저가 이미 투표했는지 (한 번이라도 투표했으면 true). */
export async function hasUserVotedInMonth(
  month: string,
  voterUserId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ submissionId: schema.monthlyHotpickVotes.submissionId })
    .from(schema.monthlyHotpickVotes)
    .innerJoin(
      schema.monthlyHotpickSubmissions,
      eq(schema.monthlyHotpickVotes.submissionId, schema.monthlyHotpickSubmissions.id),
    )
    .where(
      and(
        eq(schema.monthlyHotpickSubmissions.month, month),
        eq(schema.monthlyHotpickVotes.voterUserId, voterUserId),
      ),
    )
    .limit(1);
  return row != null;
}

/** 해당 월에 이 유저가 투표한 접수 1건 (이미지 표시용). */
export async function getVotedSubmissionByUserInMonth(
  month: string,
  voterUserId: string,
): Promise<SubmissionWithUserId | null> {
  const [row] = await db
    .select({
      id: schema.monthlyHotpickSubmissions.id,
      month: schema.monthlyHotpickSubmissions.month,
      userId: schema.monthlyHotpickSubmissions.userId,
      imageUrl: schema.monthlyHotpickSubmissions.imageUrl,
      createdAt: schema.monthlyHotpickSubmissions.createdAt,
    })
    .from(schema.monthlyHotpickVotes)
    .innerJoin(
      schema.monthlyHotpickSubmissions,
      eq(schema.monthlyHotpickVotes.submissionId, schema.monthlyHotpickSubmissions.id),
    )
    .where(
      and(
        eq(schema.monthlyHotpickSubmissions.month, month),
        eq(schema.monthlyHotpickVotes.voterUserId, voterUserId),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    month: row.month,
    userId: row.userId,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
  };
}

/** submission id 목록에 해당하는 접수 건 조회 (이미지 URL 등). */
export async function getSubmissionsByIds(
  ids: string[],
): Promise<SubmissionWithUserId[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.monthlyHotpickSubmissions)
    .where(inArray(schema.monthlyHotpickSubmissions.id, ids))
    .orderBy(asc(schema.monthlyHotpickSubmissions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    month: r.month,
    userId: r.userId,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt,
  }));
}
