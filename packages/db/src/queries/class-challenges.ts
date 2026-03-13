import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

/** 통과에 필요한 운영진 승인 수. 나중에 2 또는 3으로 변경하면 됨. */
export const REQUIRED_APPROVAL_COUNT = 1;

export async function createClassChallenge(input: {
  id: string;
  classPostId: string;
  userId: string;
  note: string;
  imageUrls: string[];
}) {
  await db.insert(schema.classChallenges).values({
    id: input.id,
    classPostId: input.classPostId,
    userId: input.userId,
    note: input.note,
    imageUrls: input.imageUrls,
    status: "pending",
  });
}

export async function getChallengeByUserAndClassPost(
  userId: string,
  classPostId: string,
): Promise<{ id: string; status: string } | null> {
  const rows = await db
    .select({ id: schema.classChallenges.id, status: schema.classChallenges.status })
    .from(schema.classChallenges)
    .where(
      and(
        eq(schema.classChallenges.userId, userId),
        eq(schema.classChallenges.classPostId, classPostId),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? { id: row.id, status: row.status } : null;
}

/** 현재 사용자가 도전 신청한 class_post_id 목록 (목록 페이지용) */
export async function getChallengesByUserForPostIds(
  userId: string,
  classPostIds: string[],
): Promise<{ classPostId: string }[]> {
  if (classPostIds.length === 0) return [];
  const rows = await db
    .select({ classPostId: schema.classChallenges.classPostId })
    .from(schema.classChallenges)
    .where(
      and(
        eq(schema.classChallenges.userId, userId),
        inArray(schema.classChallenges.classPostId, classPostIds),
      ),
    );
  return rows;
}

/** 현재 사용자 도전 상태를 postId별로 반환. Map<postId, "pending" | "approved" | "rejected"> */
export async function getMyChallengeStatusByPostIds(
  userId: string,
  classPostIds: string[],
): Promise<Map<string, "pending" | "approved" | "rejected">> {
  const map = new Map<string, "pending" | "approved" | "rejected">();
  if (classPostIds.length === 0) return map;
  const rows = await db
    .select({
      classPostId: schema.classChallenges.classPostId,
      status: schema.classChallenges.status,
    })
    .from(schema.classChallenges)
    .where(
      and(
        eq(schema.classChallenges.userId, userId),
        inArray(schema.classChallenges.classPostId, classPostIds),
      ),
    );
  for (const row of rows) {
    if (row.status === "pending" || row.status === "approved" || row.status === "rejected") {
      map.set(row.classPostId, row.status);
    }
  }
  return map;
}

export type ApprovedClassCountsByLevel = {
  beginner: number;
  intermediate: number;
  advanced: number;
};

/** 특정 사용자가 승인(approved) 완료한 클래스 도전 건수를 레벨별로 반환. */
export async function getApprovedClassChallengeCountsByUserId(
  userId: string,
): Promise<ApprovedClassCountsByLevel> {
  const rows = await db
    .select({
      level: schema.classPosts.level,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.classChallenges)
    .innerJoin(
      schema.classPosts,
      eq(schema.classChallenges.classPostId, schema.classPosts.id),
    )
    .where(
      and(
        eq(schema.classChallenges.userId, userId),
        eq(schema.classChallenges.status, "approved"),
      ),
    )
    .groupBy(schema.classPosts.level);

  const result: ApprovedClassCountsByLevel = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  };
  for (const row of rows) {
    if (row.level === "beginner" || row.level === "intermediate" || row.level === "advanced") {
      result[row.level] = row.count;
    }
  }
  return result;
}

/** 클래스별 도전 건수 (approved / pending / rejected). postId 없으면 0으로 채운 맵 반환. */
export async function getChallengeCountsByPostIds(
  classPostIds: string[],
): Promise<Map<string, { approved: number; pending: number; rejected: number }>> {
  const map = new Map<string, { approved: number; pending: number; rejected: number }>();
  for (const id of classPostIds) {
    map.set(id, { approved: 0, pending: 0, rejected: 0 });
  }
  if (classPostIds.length === 0) return map;
  const rows = await db
    .select({
      classPostId: schema.classChallenges.classPostId,
      status: schema.classChallenges.status,
    })
    .from(schema.classChallenges)
    .where(inArray(schema.classChallenges.classPostId, classPostIds));
  for (const row of rows) {
    const cur = map.get(row.classPostId)!;
    if (row.status === "approved") cur.approved += 1;
    else if (row.status === "pending") cur.pending += 1;
    else if (row.status === "rejected") cur.rejected += 1;
  }
  return map;
}

export type ChallengeForReviewRow = {
  challengeId: string;
  classPostId: string;
  classTitle: string;
  level: string;
  ropeThicknessMm: number;
  ropeLengthM: number;
  quantity: number;
  coverImageUrl: string;
  challengerUserId: string;
  challengerNickname: string;
  status: string;
  createdAt: Date;
  imageUrls: string[];
  note: string;
  /** 해당 도전에 승인/반려 투표한 운영진 닉네임·결정 목록 (페이지에서 주입) */
  processorDecisions?: { nickname: string; decision: "approved" | "rejected" }[];
};

/** 도전별로 심사에 참여한 운영진(처리자) 닉네임·결정 목록. challengeId -> { nickname, decision }[] */
export async function getProcessorDecisionsByChallengeIds(
  challengeIds: string[],
): Promise<Map<string, { nickname: string; decision: "approved" | "rejected" }[]>> {
  const map = new Map<string, { nickname: string; decision: "approved" | "rejected" }[]>();
  for (const id of challengeIds) map.set(id, []);
  if (challengeIds.length === 0) return map;

  const rows = await db
    .select({
      challengeId: schema.classChallengeApprovals.challengeId,
      decision: schema.classChallengeApprovals.decision,
      nickname: schema.memberProfiles.nickname,
    })
    .from(schema.classChallengeApprovals)
    .leftJoin(
      schema.memberProfiles,
      eq(schema.classChallengeApprovals.staffUserId, schema.memberProfiles.userId),
    )
    .where(inArray(schema.classChallengeApprovals.challengeId, challengeIds));

  for (const row of rows) {
    const nick = row.nickname?.trim() ? row.nickname.trim() : "(닉네임 없음)";
    const decision = row.decision === "rejected" ? "rejected" : "approved";
    const list = map.get(row.challengeId)!;
    list.push({ nickname: nick, decision });
  }
  return map;
}

/** 레벨별 심사용 도전 목록 (클래스 정보 + 도전자 닉네임). status 필터 선택. */
export async function getChallengesForReviewByLevel(
  level: "beginner" | "intermediate" | "advanced",
  options?: { status?: "pending" | "approved" | "rejected" },
): Promise<ChallengeForReviewRow[]> {
  const rows = await db
    .select({
      challengeId: schema.classChallenges.id,
      classPostId: schema.classChallenges.classPostId,
      classTitle: schema.classPosts.title,
      level: schema.classPosts.level,
      ropeThicknessMm: schema.classPosts.ropeThicknessMm,
      ropeLengthM: schema.classPosts.ropeLengthM,
      quantity: schema.classPosts.quantity,
      coverImageUrl: schema.classPosts.coverImageUrl,
      challengerUserId: schema.classChallenges.userId,
      challengerNickname: schema.memberProfiles.nickname,
      status: schema.classChallenges.status,
      createdAt: schema.classChallenges.createdAt,
      imageUrls: schema.classChallenges.imageUrls,
      note: schema.classChallenges.note,
    })
    .from(schema.classChallenges)
    .innerJoin(
      schema.classPosts,
      eq(schema.classChallenges.classPostId, schema.classPosts.id),
    )
    .leftJoin(
      schema.memberProfiles,
      eq(schema.classChallenges.userId, schema.memberProfiles.userId),
    )
    .where(
      options?.status
        ? and(
            eq(schema.classPosts.level, level),
            eq(schema.classChallenges.status, options.status),
          )
        : eq(schema.classPosts.level, level),
    )
    .orderBy(asc(schema.classChallenges.createdAt));

  return rows.map((r) => ({
    ...r,
    challengerNickname: r.challengerNickname ?? "(닉네임 없음)",
    imageUrls: Array.isArray(r.imageUrls) ? (r.imageUrls as string[]) : [],
  }));
}

/** 도전 심사 상태 변경 (승인/반려). 단일 승인 시 직접 사용 가능. */
export async function updateClassChallengeStatus(
  challengeId: string,
  status: "approved" | "rejected",
): Promise<void> {
  await db
    .update(schema.classChallenges)
    .set({ status })
    .where(eq(schema.classChallenges.id, challengeId));
}

/** 해당 도전에 대한 승인(approved) 개수 */
export async function getApprovedCountForChallenge(
  challengeId: string,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int`.as("count") })
    .from(schema.classChallengeApprovals)
    .where(
      and(
        eq(schema.classChallengeApprovals.challengeId, challengeId),
        eq(schema.classChallengeApprovals.decision, "approved"),
      ),
    );
  return rows[0]?.count ?? 0;
}

/** 승인/반려 시 추가 데이터 */
export type ChallengeReviewPayload = {
  /** 승인 시 코멘트 (선택) */
  comment?: string | null;
  /** 반려 시 사유(설명) */
  rejectionNote?: string | null;
  /** 반려 시 참고 이미지 URL 목록 */
  rejectionImageUrls?: string[] | null;
};

/** 운영진 한 명의 심사 결과 기록 (기존 투표 있으면 덮어씀). 이후 필요 시 최종 status 반영. pending이 아닌 도전은 무시. */
export async function submitChallengeReview(
  challengeId: string,
  staffUserId: string,
  decision: "approved" | "rejected",
  payload?: ChallengeReviewPayload,
): Promise<void> {
  const [challenge] = await db
    .select({ status: schema.classChallenges.status })
    .from(schema.classChallenges)
    .where(eq(schema.classChallenges.id, challengeId))
    .limit(1);
  if (!challenge || challenge.status !== "pending") return;

  const comment =
    decision === "approved" && payload?.comment?.trim()
      ? payload.comment.trim()
      : null;
  const rejectionNote =
    decision === "rejected" && payload?.rejectionNote?.trim()
      ? payload.rejectionNote.trim()
      : null;
  const rejectionImageUrls =
    decision === "rejected" && payload?.rejectionImageUrls?.length
      ? payload.rejectionImageUrls
      : null;

  await db
    .insert(schema.classChallengeApprovals)
    .values({
      challengeId,
      staffUserId,
      decision,
      comment,
      rejectionNote,
      rejectionImageUrls,
    })
    .onConflictDoUpdate({
      target: [
        schema.classChallengeApprovals.challengeId,
        schema.classChallengeApprovals.staffUserId,
      ],
      set: {
        decision,
        comment,
        rejectionNote,
        rejectionImageUrls,
        createdAt: new Date(),
      },
    });

  if (decision === "rejected") {
    await updateClassChallengeStatus(challengeId, "rejected");
    return;
  }

  const approvedCount = await getApprovedCountForChallenge(challengeId);
  if (approvedCount >= REQUIRED_APPROVAL_COUNT) {
    await updateClassChallengeStatus(challengeId, "approved");
  }
}
