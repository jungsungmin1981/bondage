import {
  getBunnyPhotoPosts,
  getBunnyPhotoLikesStateForPhotoIds,
  type BunnyPhotoPost,
} from "@workspace/db";
import { type SerializedBunnyPost, BUNNY_INITIAL_SIZE, BUNNY_PAGE_SIZE } from "./bunny-posts-types";
export type { SerializedBunnyPost, SerializedBunnyPhotoRow } from "./bunny-posts-types";
export { BUNNY_INITIAL_SIZE, BUNNY_PAGE_SIZE } from "./bunny-posts-types";


function serializeBunnyPost(p: BunnyPhotoPost): SerializedBunnyPost {
  return {
    postId: p.postId,
    createdAt:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    caption: p.caption,
    photos: p.photos.map((ph) => ({
      id: ph.id,
      postId: ph.postId ?? null,
      bunnyProfileId: ph.bunnyProfileId,
      userId: ph.userId,
      imagePath: ph.imagePath,
      caption: ph.caption ?? null,
      createdAt: ph.createdAt
        ? ph.createdAt instanceof Date
          ? ph.createdAt.toISOString()
          : String(ph.createdAt)
        : null,
    })),
  };
}

export type BunnySliceResult = {
  posts: SerializedBunnyPost[];
  /** 첫 번째 사진 ID 기준 좋아요 상태 */
  likeByPhotoId: Record<string, { count: number; liked: boolean }>;
  hasMore: boolean;
  totalCount: number;
};

/** 서버 전용: 오프셋 구간만 배치 조회 후 직렬화 */
export async function fetchBunnyPostsSlice(
  bunnyProfileId: string,
  offset: number,
  limit: number,
  userId: string,
): Promise<BunnySliceResult> {
  const all = await getBunnyPhotoPosts(bunnyProfileId);
  const totalCount = all.length;
  const slice = all.slice(offset, offset + limit);
  const serialized = slice.map(serializeBunnyPost);

  // 각 게시물의 첫 번째 사진 ID로 좋아요 상태 일괄 조회
  const firstPhotoIds = slice
    .map((p) => p.photos[0]?.id)
    .filter((id): id is string => Boolean(id));

  const likeStateMap =
    firstPhotoIds.length > 0
      ? await getBunnyPhotoLikesStateForPhotoIds(firstPhotoIds, userId)
      : new Map<string, { photoId: string; count: number; liked: boolean }>();

  const likeByPhotoId: Record<string, { count: number; liked: boolean }> = {};
  for (const p of slice) {
    const firstId = p.photos[0]?.id;
    if (!firstId) continue;
    const s = likeStateMap.get(firstId);
    likeByPhotoId[firstId] = s ? { count: s.count, liked: s.liked } : { count: 0, liked: false };
  }

  const hasMore = offset + limit < totalCount;
  return { posts: serialized, likeByPhotoId, hasMore, totalCount };
}
