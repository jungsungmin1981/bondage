import { and, asc, count, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export async function getRiggerPhotos(riggerId: string) {
  return db
    .select()
    .from(schema.riggerPhotos)
    .where(eq(schema.riggerPhotos.riggerId, riggerId))
    .orderBy(desc(schema.riggerPhotos.createdAt));
}

export type RiggerPhotoRow = Awaited<ReturnType<typeof getRiggerPhotos>>[number];

export type RiggerPhotoPost = {
  postId: string;
  createdAt: Date;
  caption: string | null;
  photos: RiggerPhotoRow[];
};

export function groupPhotosByPost(photos: RiggerPhotoRow[]): RiggerPhotoPost[] {
  const byPost = new Map<string, RiggerPhotoRow[]>();
  for (const p of photos) {
    const key = p.postId ?? p.id;
    if (!byPost.has(key)) byPost.set(key, []);
    byPost.get(key)!.push(p);
  }
  for (const arr of byPost.values()) {
    arr.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }
  const posts: RiggerPhotoPost[] = [];
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

export async function getRiggerPhotoPosts(riggerId: string): Promise<RiggerPhotoPost[]> {
  const photos = await getRiggerPhotos(riggerId);
  return groupPhotosByPost(photos);
}

/** 리거의 게시물 수만 빠르게 확인 (존재 여부 체크용) */
export async function getRiggerPhotoPostCount(riggerId: string): Promise<number> {
  const rows = await db
    .selectDistinct({ postId: schema.riggerPhotos.postId })
    .from(schema.riggerPhotos)
    .where(eq(schema.riggerPhotos.riggerId, riggerId));
  return rows.length;
}

/**
 * 리거의 모든 게시물 요약 (포스트당 한 행).
 * COALESCE(post_id, id)를 effective key로 사용하므로 레거시 사진(post_id=null)도 정확히 처리.
 * 전체 사진 대신 대표 한 행만 반환 → 쿼리 부하 대폭 감소.
 */
export type RiggerPostSummary = {
  effectivePostId: string;
  userId: string;
  visibility: string;
  visibilityAfterApproval: string | null;
  createdAt: Date;
  caption: string | null;
};

export async function getRiggerPostSummaries(
  riggerId: string,
): Promise<RiggerPostSummary[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT ON (COALESCE(post_id, id))
      COALESCE(post_id, id) AS effective_post_id,
      user_id,
      visibility,
      visibility_after_approval,
      created_at,
      caption
    FROM rigger_photos
    WHERE rigger_id = ${riggerId}
    ORDER BY COALESCE(post_id, id), created_at ASC
  `);

  return Array.from(result as Iterable<Record<string, unknown>>)
    .map((r) => ({
      effectivePostId: r["effective_post_id"] as string,
      userId: r["user_id"] as string,
      visibility: r["visibility"] as string,
      visibilityAfterApproval: r["visibility_after_approval"] as string | null,
      createdAt:
        r["created_at"] instanceof Date
          ? r["created_at"]
          : new Date(r["created_at"] as string),
      caption: r["caption"] as string | null,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * effectivePostId 목록에 해당하는 사진만 조회 (슬라이스된 페이지 상세용).
 * effectivePostId = COALESCE(post_id, id) → 모던/레거시 모두 처리.
 */
export async function getRiggerPhotosByPostIds(
  effectivePostIds: string[],
): Promise<RiggerPhotoRow[]> {
  if (effectivePostIds.length === 0) return [];
  return db
    .select()
    .from(schema.riggerPhotos)
    .where(
      or(
        inArray(schema.riggerPhotos.postId, effectivePostIds),
        inArray(schema.riggerPhotos.id, effectivePostIds),
      ),
    )
    .orderBy(asc(schema.riggerPhotos.createdAt));
}

/** postId 기준 해당 게시물의 사진 목록 (모달 상세용). created_at 오름차순. */
export async function getPhotosByPostId(
  postId: string,
): Promise<{ imagePath: string; caption: string | null }[]> {
  const rows = await db
    .select({
      imagePath: schema.riggerPhotos.imagePath,
      caption: schema.riggerPhotos.caption,
    })
    .from(schema.riggerPhotos)
    .where(eq(schema.riggerPhotos.postId, postId))
    .orderBy(asc(schema.riggerPhotos.createdAt));
  return rows.map((r) => ({
    imagePath: r.imagePath,
    caption: r.caption,
  }));
}

/**
 * 해당 postId(또는 post_id 없는 예전 글의 사진 id)가 주어진 userId 소유인지
 * — 본인 게시물 좋아요 방지 등에 사용
 */
export async function isPostOwnedByUser(postId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: schema.riggerPhotos.userId })
    .from(schema.riggerPhotos)
    .where(
      or(eq(schema.riggerPhotos.postId, postId), eq(schema.riggerPhotos.id, postId)),
    )
    .limit(1);
  return rows[0]?.userId === userId;
}

/**
 * 본인 게시물 삭제 (postId 기준, 레거시: post_id 없는 경우 id도 허용)
 */
export async function deleteRiggerPostOwnedByUser(
  riggerId: string,
  postId: string,
  userId: string,
): Promise<number> {
  // 먼저 해당 postId에 대한 버니 승인요청(bunny_approvals)을 정리한다.
  await db
    .delete(schema.bunnyApprovals)
    .where(eq(schema.bunnyApprovals.postId, postId));

  const deleted = await db
    .delete(schema.riggerPhotos)
    .where(
      and(
        eq(schema.riggerPhotos.riggerId, riggerId),
        eq(schema.riggerPhotos.userId, userId),
        or(eq(schema.riggerPhotos.postId, postId), eq(schema.riggerPhotos.id, postId)),
      ),
    )
    .returning({ id: schema.riggerPhotos.id });
  return deleted.length;
}

export async function updateRiggerPostVisibilityOwnedByUser(
  riggerId: string,
  postId: string,
  userId: string,
  visibility: "public" | "private",
): Promise<number> {
  const updated = await db
    .update(schema.riggerPhotos)
    .set({ visibility })
    .where(
      and(
        eq(schema.riggerPhotos.riggerId, riggerId),
        eq(schema.riggerPhotos.userId, userId),
        ne(schema.riggerPhotos.visibility, "pending"),
        or(eq(schema.riggerPhotos.postId, postId), eq(schema.riggerPhotos.id, postId)),
      ),
    )
    .returning({ id: schema.riggerPhotos.id });
  return updated.length;
}

/**
 * 게시물 삭제 (riggerId + postId 기준, 관리자용. bunny_approvals 선 삭제)
 */
export async function deleteRiggerPost(
  riggerId: string,
  postId: string,
): Promise<number> {
  await db
    .delete(schema.bunnyApprovals)
    .where(eq(schema.bunnyApprovals.postId, postId));
  const deleted = await db
    .delete(schema.riggerPhotos)
    .where(
      and(
        eq(schema.riggerPhotos.riggerId, riggerId),
        or(eq(schema.riggerPhotos.postId, postId), eq(schema.riggerPhotos.id, postId)),
      ),
    )
    .returning({ id: schema.riggerPhotos.id });
  return deleted.length;
}

/**
 * 게시물 공개유무 변경 (riggerId + postId 기준, 관리자용. pending 제외)
 */
export async function updateRiggerPostVisibilityByPost(
  riggerId: string,
  postId: string,
  visibility: "public" | "private",
): Promise<number> {
  const updated = await db
    .update(schema.riggerPhotos)
    .set({ visibility })
    .where(
      and(
        eq(schema.riggerPhotos.riggerId, riggerId),
        ne(schema.riggerPhotos.visibility, "pending"),
        or(eq(schema.riggerPhotos.postId, postId), eq(schema.riggerPhotos.id, postId)),
      ),
    )
    .returning({ id: schema.riggerPhotos.id });
  return updated.length;
}

/**
 * postId에 해당하는 rigger_photos 한 건의 visibility_after_approval 조회.
 * 버니 승인 완료 시 적용할 공개/비공개 결정에 사용. null이면 호출부에서 public으로 처리.
 */
export async function getVisibilityAfterApprovalByPostId(
  postId: string,
): Promise<"public" | "private" | null> {
  const rows = await db
    .select({ visibilityAfterApproval: schema.riggerPhotos.visibilityAfterApproval })
    .from(schema.riggerPhotos)
    .where(eq(schema.riggerPhotos.postId, postId))
    .limit(1);
  const v = rows[0]?.visibilityAfterApproval;
  return v === "private" ? "private" : v === "public" ? "public" : null;
}

/**
 * postId 기준으로 해당 게시물(사진들)의 visibility 일괄 업데이트.
 * 버니 승인 완료 시 전체 공개로 전환할 때 사용.
 */
export async function setRiggerPostVisibilityByPostId(
  postId: string,
  visibility: "public" | "private",
): Promise<number> {
  const updated = await db
    .update(schema.riggerPhotos)
    .set({ visibility })
    .where(eq(schema.riggerPhotos.postId, postId))
    .returning({ id: schema.riggerPhotos.id });
  return updated.length;
}
