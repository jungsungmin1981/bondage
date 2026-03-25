import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export async function getPostLikeCount(postId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int`.as("count") })
    .from(schema.postLikes)
    .where(eq(schema.postLikes.postId, postId));
  return rows[0]?.count ?? 0;
}

export async function isPostLikedByUser(postId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.postLikes.id })
    .from(schema.postLikes)
    .where(and(eq(schema.postLikes.postId, postId), eq(schema.postLikes.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function deletePostLike(postId: string, userId: string): Promise<void> {
  await db
    .delete(schema.postLikes)
    .where(and(eq(schema.postLikes.postId, postId), eq(schema.postLikes.userId, userId)));
}

export async function insertPostLike(id: string, postId: string, userId: string): Promise<void> {
  await db.insert(schema.postLikes).values({ id, postId, userId });
}

export type PostLikeState = { postId: string; count: number; liked: boolean };

/**
 * 여러 postId에 대해 좋아요 수 + 내가 눌렀는지 한 번에 조회 (N+1 방지, 연결 수 절약)
 */
export async function getPostLikesStateForPostIds(
  postIds: string[],
  userId: string,
): Promise<Map<string, PostLikeState>> {
  const map = new Map<string, PostLikeState>();
  if (postIds.length === 0) return map;
  const unique = [...new Set(postIds)];
  for (const id of unique) {
    map.set(id, { postId: id, count: 0, liked: false });
  }

  // count + liked를 BOOL_OR로 한 번에 조회
  const rows = await db
    .select({
      postId: schema.postLikes.postId,
      count: sql<number>`count(*)::int`,
      liked: sql<boolean>`bool_or(${schema.postLikes.userId} = ${userId})`,
    })
    .from(schema.postLikes)
    .where(inArray(schema.postLikes.postId, unique))
    .groupBy(schema.postLikes.postId);

  for (const row of rows) {
    map.set(row.postId, { postId: row.postId, count: row.count, liked: row.liked });
  }

  return map;
}

export type PostLikerRow = {
  userId: string;
  name: string | null;
  createdAt: Date | null;
};

/** 해당 게시물에 좋아요 누른 사용자 목록 (닉네임 = users.name) */
export async function getPostLikersWithNames(postId: string): Promise<PostLikerRow[]> {
  const rows = await db
    .select({
      userId: schema.postLikes.userId,
      name: schema.users.name,
      createdAt: schema.postLikes.createdAt,
    })
    .from(schema.postLikes)
    .leftJoin(schema.users, eq(schema.postLikes.userId, schema.users.id))
    .where(eq(schema.postLikes.postId, postId))
    .orderBy(asc(schema.postLikes.createdAt));
  return rows;
}
