import {
  getCommentsByPhotoIdsWithAuthorGrouped,
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
  const totalCount = all.length;
  const slice = all.slice(offset, offset + limit);
  const serialized = slice.map(serializePost);

  const postIds = slice.map((p) => p.postId);
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
