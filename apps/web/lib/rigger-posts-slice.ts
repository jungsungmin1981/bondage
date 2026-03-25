import {
  getBunnyApprovalStatusesByPostIds,
  getCommentsByPhotoIdsWithAuthorGrouped,
  getPostIdsWhereUserIsRequestedBunny,
  getPostLikesStateForPostIds,
  getRiggerPhotosByPostIds,
  getRiggerPostSummaries,
  groupPhotosByPost,
} from "@workspace/db";
import type { RiggerPhotoPost } from "@workspace/db";
import type { SerializedPost } from "./rigger-posts-types";
export type { SerializedPost, SerializedPhotoRow } from "./rigger-posts-types";

function serializePost(p: RiggerPhotoPost): SerializedPost {
  return {
    postId: p.postId,
    createdAt:
      p.createdAt instanceof Date
        ? p.createdAt.toISOString()
        : String(p.createdAt),
    caption: p.caption,
    photos: p.photos.map((ph) => ({
      id: ph.id,
      postId: ph.postId,
      riggerId: ph.riggerId,
      userId: ph.userId,
      imagePath: ph.imagePath,
      caption: ph.caption,
      visibility:
        (ph as any).visibility === "private"
          ? "private"
          : (ph as any).visibility === "pending"
            ? "pending"
            : "public",
      createdAt: ph.createdAt
        ? ph.createdAt instanceof Date
          ? ph.createdAt.toISOString()
          : String(ph.createdAt)
        : null,
    })),
  };
}

export type SliceResult = {
  posts: SerializedPost[];
  likeByPostId: Record<string, { count: number; liked: boolean }>;
  commentsByPhotoId: Record<string, unknown[]>;
  hasMore: boolean;
  totalCount: number;
};

/**
 * 서버 전용: 2단계 쿼리로 효율적으로 슬라이스 조회.
 *  1단계: 포스트 요약(1행/포스트)으로 visibility 필터 + 총 개수 + 슬라이스 postId 결정
 *  2단계: 슬라이스 postId에 해당하는 사진만 조회 → 전체 사진 로드 불필요
 * visibilityAsUserId 있으면 해당 유저 시점으로 비공개/승인대기 노출(관리자용).
 */
export async function fetchRiggerPostsSlice(
  riggerId: string,
  offset: number,
  limit: number,
  userId: string,
  options?: { visibilityAsUserId?: string },
): Promise<SliceResult> {
  // 1단계: 포스트당 1행 요약 조회 (전체 사진 대신 대표 행 1개)
  const summaries = await getRiggerPostSummaries(riggerId);

  const ownerIdForVisibility = options?.visibilityAsUserId ?? userId;

  // pending 게시물 postId만 추출 → bunny 승인 여부 조회 범위 최소화
  const pendingPostIds = summaries
    .filter((s) => s.visibility === "pending")
    .map((s) => s.effectivePostId);

  const requestedBunnyPostIds =
    pendingPostIds.length > 0
      ? await getPostIdsWhereUserIsRequestedBunny(pendingPostIds, userId)
      : new Set<string>();

  // visibility 필터 (요약 행 기준)
  const visibleSummaries = summaries.filter((s) => {
    const vis = s.visibility;
    if (vis !== "private" && vis !== "pending") return true;
    if (s.userId === ownerIdForVisibility) return true;
    if (vis === "pending" && requestedBunnyPostIds.has(s.effectivePostId))
      return true;
    return false;
  });

  const totalCount = visibleSummaries.length;

  // 페이지 슬라이스
  const pageSlice = visibleSummaries.slice(offset, offset + limit);
  const slicePostIds = pageSlice.map((s) => s.effectivePostId);

  // 2단계: 슬라이스에 해당하는 postId의 사진만 조회
  const photos = await getRiggerPhotosByPostIds(slicePostIds);
  const posts = groupPhotosByPost(photos);

  // summaries 정렬 순서에 맞게 재정렬
  const postOrder = new Map(slicePostIds.map((id, i) => [id, i]));
  posts.sort(
    (a, b) => (postOrder.get(a.postId) ?? 0) - (postOrder.get(b.postId) ?? 0),
  );

  const serialized = posts.map(serializePost);

  const postIds = posts.map((p) => p.postId);

  const bunnyApprovalsByPostId =
    postIds.length > 0
      ? await getBunnyApprovalStatusesByPostIds(postIds)
      : new Map<string, any[]>();

  for (const post of serialized) {
    const rows = bunnyApprovalsByPostId.get(post.postId);
    if (!rows || rows.length === 0) continue;
    post.bunnyApprovals = rows.map((row) => ({
      name:
        (row.name && String(row.name).trim()) ||
        (row.email ? row.email.replace(/@.*$/, "") : "버니"),
      email: row.email,
      status: row.status as "pending" | "approved" | "rejected",
    }));
  }

  const likeStateMap =
    postIds.length > 0
      ? await getPostLikesStateForPostIds(postIds, userId)
      : new Map();
  const likeByPostId: Record<string, { count: number; liked: boolean }> = {};
  for (const post of posts) {
    const s = likeStateMap.get(post.postId);
    likeByPostId[post.postId] = s ?? { count: 0, liked: false };
  }

  const commentPhotoIds = posts
    .map((p) => p.photos[0]?.id)
    .filter((id): id is string => Boolean(id));
  const commentsGrouped =
    commentPhotoIds.length > 0
      ? await getCommentsByPhotoIdsWithAuthorGrouped(commentPhotoIds)
      : new Map();
  const commentsByPhotoId: Record<string, unknown[]> = {};
  for (const [pid, list] of commentsGrouped.entries()) {
    commentsByPhotoId[pid] = list;
  }

  const hasMore = offset + limit < totalCount;
  return {
    posts: serialized,
    likeByPostId,
    commentsByPhotoId,
    hasMore,
    totalCount,
  };
}
