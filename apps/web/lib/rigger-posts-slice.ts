import {
  getBunnyApprovalStatusesByPostIds,
  getCommentsByPhotoIdsWithAuthorGrouped,
  getPostIdsWhereUserIsRequestedBunny,
  getPostLikesStateForPostIds,
  getRiggerPhotoPosts,
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

/** 서버 전용: 오프셋 구간만 배치 조회 후 직렬화 */
export async function fetchRiggerPostsSlice(
  riggerId: string,
  offset: number,
  limit: number,
  userId: string,
): Promise<SliceResult> {
  const all = await getRiggerPhotoPosts(riggerId);
  const allPostIds = all.map((p) => p.postId);
  const requestedBunnyPostIds =
    allPostIds.length > 0
      ? await getPostIdsWhereUserIsRequestedBunny(allPostIds, userId)
      : new Set<string>();
  // 비공개(private)는 작성자에게만, 승인대기(pending)는 작성자 또는 승인 요청된 버니에게 노출
  const visibleAll = all.filter((p) => {
    const first: any = p.photos[0];
    const visibility = String(first?.visibility ?? "public");
    if (visibility !== "private" && visibility !== "pending") return true;
    if (first?.userId === userId) return true;
    if (visibility === "pending" && requestedBunnyPostIds.has(p.postId))
      return true;
    return false;
  });
  const totalCount = visibleAll.length;
  const slice = visibleAll.slice(offset, offset + limit);
  const serialized = slice.map(serializePost);

  const postIds = slice.map((p) => p.postId);
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
  for (const p of slice) {
    const s = likeStateMap.get(p.postId);
    likeByPostId[p.postId] = s ?? { count: 0, liked: false };
  }

  const commentPhotoIds = slice
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
