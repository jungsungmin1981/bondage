import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export async function getBunnyPhotos(bunnyProfileId: string, limit = 50) {
  return db
    .select()
    .from(schema.bunnyPhotos)
    .where(eq(schema.bunnyPhotos.bunnyProfileId, bunnyProfileId))
    .orderBy(desc(schema.bunnyPhotos.createdAt))
    .limit(limit);
}

export type BunnyPhotoRow = Awaited<ReturnType<typeof getBunnyPhotos>>[number];

export type BunnyPhotoPost = {
  postId: string;
  createdAt: Date;
  caption: string | null;
  photos: BunnyPhotoRow[];
};

/** postId 기준으로 사진을 묶어 게시물 목록으로 반환 (최신순) */
export function groupBunnyPhotosByPost(photos: BunnyPhotoRow[]): BunnyPhotoPost[] {
  const byPost = new Map<string, BunnyPhotoRow[]>();
  for (const p of photos) {
    const key = p.postId ?? p.id;
    if (!byPost.has(key)) byPost.set(key, []);
    byPost.get(key)!.push(p);
  }
  for (const arr of byPost.values()) {
    arr.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }
  const posts: BunnyPhotoPost[] = [];
  for (const [postId, photosInPost] of byPost.entries()) {
    const first = photosInPost[0];
    if (!first) continue;
    posts.push({
      postId,
      createdAt: first.createdAt ?? new Date(),
      caption: first.caption,
      photos: photosInPost,
    });
  }
  posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return posts;
}

export async function getBunnyPhotoPosts(bunnyProfileId: string): Promise<BunnyPhotoPost[]> {
  const photos = await getBunnyPhotos(bunnyProfileId, 200);
  return groupBunnyPhotosByPost(photos);
}

/** 본인 게시물 삭제 (postId 기준, post_id 없는 레거시는 id도 허용) */
export async function deleteBunnyPostOwnedByUser(
  bunnyProfileId: string,
  postId: string,
  userId: string,
): Promise<number> {
  const deleted = await db
    .delete(schema.bunnyPhotos)
    .where(
      and(
        eq(schema.bunnyPhotos.bunnyProfileId, bunnyProfileId),
        eq(schema.bunnyPhotos.userId, userId),
        or(eq(schema.bunnyPhotos.postId, postId), eq(schema.bunnyPhotos.id, postId)),
      ),
    )
    .returning({ id: schema.bunnyPhotos.id });
  return deleted.length;
}

/** 캡션 수정 (postId 기준 해당 게시물 전체 사진의 caption 업데이트) */
export async function updateBunnyPostCaptionOwnedByUser(
  bunnyProfileId: string,
  postId: string,
  userId: string,
  caption: string | null,
): Promise<number> {
  const updated = await db
    .update(schema.bunnyPhotos)
    .set({ caption })
    .where(
      and(
        eq(schema.bunnyPhotos.bunnyProfileId, bunnyProfileId),
        eq(schema.bunnyPhotos.userId, userId),
        or(eq(schema.bunnyPhotos.postId, postId), eq(schema.bunnyPhotos.id, postId)),
      ),
    )
    .returning({ id: schema.bunnyPhotos.id });
  return updated.length;
}

/** postId가 특정 userId 소유인지 확인 */
export async function isBunnyPostOwnedByUser(postId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: schema.bunnyPhotos.userId })
    .from(schema.bunnyPhotos)
    .where(
      or(eq(schema.bunnyPhotos.postId, postId), eq(schema.bunnyPhotos.id, postId)),
    )
    .limit(1);
  return rows[0]?.userId === userId;
}

// ─── 좋아요 쿼리 ──────────────────────────────────────────────────────────────

export async function isBunnyPhotoLikedByUser(photoId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.bunnyPhotoLikes.id })
    .from(schema.bunnyPhotoLikes)
    .where(
      and(
        eq(schema.bunnyPhotoLikes.photoId, photoId),
        eq(schema.bunnyPhotoLikes.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function insertBunnyPhotoLike(id: string, photoId: string, userId: string): Promise<void> {
  await db.insert(schema.bunnyPhotoLikes).values({ id, photoId, userId });
}

export async function deleteBunnyPhotoLike(photoId: string, userId: string): Promise<void> {
  await db
    .delete(schema.bunnyPhotoLikes)
    .where(
      and(
        eq(schema.bunnyPhotoLikes.photoId, photoId),
        eq(schema.bunnyPhotoLikes.userId, userId),
      ),
    );
}

export async function getBunnyPhotoLikeCount(photoId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int`.as("count") })
    .from(schema.bunnyPhotoLikes)
    .where(eq(schema.bunnyPhotoLikes.photoId, photoId));
  return rows[0]?.count ?? 0;
}

export type BunnyPhotoLikeState = { photoId: string; count: number; liked: boolean };

/** 여러 photoId에 대해 좋아요 수 + 내가 눌렀는지 일괄 조회 (N+1 방지) */
export async function getBunnyPhotoLikesStateForPhotoIds(
  photoIds: string[],
  userId: string,
): Promise<Map<string, BunnyPhotoLikeState>> {
  const map = new Map<string, BunnyPhotoLikeState>();
  if (photoIds.length === 0) return map;
  const unique = [...new Set(photoIds)];
  for (const id of unique) {
    map.set(id, { photoId: id, count: 0, liked: false });
  }

  // count + liked를 BOOL_OR로 한 번에 조회
  const rows = await db
    .select({
      photoId: schema.bunnyPhotoLikes.photoId,
      count: sql<number>`count(*)::int`,
      liked: sql<boolean>`bool_or(${schema.bunnyPhotoLikes.userId} = ${userId})`,
    })
    .from(schema.bunnyPhotoLikes)
    .where(inArray(schema.bunnyPhotoLikes.photoId, unique))
    .groupBy(schema.bunnyPhotoLikes.photoId);

  for (const row of rows) {
    map.set(row.photoId, { photoId: row.photoId, count: row.count, liked: row.liked });
  }

  return map;
}

export type BunnyGroupLikeState = { groupPostId: string; count: number; liked: boolean };

/** 버니 포스트 그룹에서 대표 사진 ID 반환 (created_at 오름차순 첫 번째) */
export async function getRepresentativeBunnyPhotoId(groupPostId: string): Promise<string | null> {
  const rows = await db
    .select({ id: schema.bunnyPhotos.id })
    .from(schema.bunnyPhotos)
    .where(or(eq(schema.bunnyPhotos.postId, groupPostId), eq(schema.bunnyPhotos.id, groupPostId)))
    .orderBy(asc(schema.bunnyPhotos.createdAt))
    .limit(1);
  return rows[0]?.id ?? null;
}

/**
 * 버니 포스트 그룹 단위 좋아요 수 + 내가 눌렀는지 일괄 조회.
 * bunny_photo_likes ↔ bunny_photos 조인 후 COALESCE(post_id, id) 기준 집계.
 */
export async function getBunnyGroupLikeStates(
  bunnyGroupPostIds: string[],
  userId: string,
): Promise<Map<string, BunnyGroupLikeState>> {
  const map = new Map<string, BunnyGroupLikeState>();
  if (bunnyGroupPostIds.length === 0) return map;
  const unique = [...new Set(bunnyGroupPostIds)];
  for (const id of unique) {
    map.set(id, { groupPostId: id, count: 0, liked: false });
  }

  // sql.join 으로 IN 절 파라미터 생성 (= ANY 는 JS 배열을 PG 배열로 인식 못함)
  const inClause = sql.join(unique.map((id) => sql`${id}`), sql`, `);

  const result = await db.execute(sql`
    SELECT
      COALESCE(bp.post_id, bp.id)       AS group_post_id,
      COUNT(bpl.id)::int                AS count,
      BOOL_OR(bpl.user_id = ${userId})  AS liked
    FROM bunny_photo_likes bpl
    JOIN bunny_photos bp ON bp.id = bpl.photo_id
    WHERE COALESCE(bp.post_id, bp.id) IN (${inClause})
    GROUP BY COALESCE(bp.post_id, bp.id)
  `);

  for (const row of Array.from(result as Iterable<Record<string, unknown>>)) {
    const groupPostId = row["group_post_id"] as string;
    map.set(groupPostId, {
      groupPostId,
      count: Number(row["count"]),
      liked: Boolean(row["liked"]),
    });
  }
  return map;
}

/** 버니 포스트 그룹에서 userId의 모든 좋아요 삭제 */
export async function deleteBunnyGroupLikes(groupPostId: string, userId: string): Promise<void> {
  await db.execute(sql`
    DELETE FROM bunny_photo_likes
    WHERE user_id = ${userId}
      AND photo_id IN (
        SELECT id FROM bunny_photos WHERE COALESCE(post_id, id) = ${groupPostId}
      )
  `);
}

/** 버니 포스트 그룹 전체 좋아요 수 반환 */
export async function getBunnyGroupLikeCount(groupPostId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(bpl.id)::int AS count
    FROM bunny_photo_likes bpl
    JOIN bunny_photos bp ON bp.id = bpl.photo_id
    WHERE COALESCE(bp.post_id, bp.id) = ${groupPostId}
  `);
  const row = Array.from(result as Iterable<Record<string, unknown>>)[0];
  return Number(row?.["count"] ?? 0);
}

export type BunnyPhotoLikerRow = {
  userId: string;
  name: string | null;
  createdAt: Date | null;
};

/** 본인 사진 좋아요 누른 사람 목록 */
export async function getBunnyPhotoLikersWithNames(photoId: string): Promise<BunnyPhotoLikerRow[]> {
  const rows = await db
    .select({
      userId: schema.bunnyPhotoLikes.userId,
      name: schema.memberProfiles.nickname,
      createdAt: schema.bunnyPhotoLikes.createdAt,
    })
    .from(schema.bunnyPhotoLikes)
    .leftJoin(schema.memberProfiles, eq(schema.bunnyPhotoLikes.userId, schema.memberProfiles.userId))
    .where(eq(schema.bunnyPhotoLikes.photoId, photoId))
    .orderBy(asc(schema.bunnyPhotoLikes.createdAt));
  return rows;
}
