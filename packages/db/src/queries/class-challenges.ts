import { and, eq, inArray } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

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
