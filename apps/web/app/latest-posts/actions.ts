"use server";

import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { auth } from "@workspace/auth";
import {
  deletePostLike,
  getPostLikeCount,
  insertPostLike,
  isPostLikedByUser,
  isPostOwnedByUser,
} from "@workspace/db";
import { randomUUID } from "crypto";

/**
 * 최신 게시물 페이지용 좋아요 토글.
 * 리거·버니 게시물 모두 post_likes 테이블을 통합 사용.
 */
export async function toggleLatestPostLike(
  postId: string,
): Promise<{ ok: true; liked: boolean; count: number } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  try {
    if (await isPostOwnedByUser(postId, session.user.id)) {
      return { ok: false, error: "본인 게시물에는 좋아요할 수 없습니다." };
    }
    const liked = await isPostLikedByUser(postId, session.user.id);
    if (liked) {
      await deletePostLike(postId, session.user.id);
    } else {
      await insertPostLike(randomUUID(), postId, session.user.id);
    }
    const count = await getPostLikeCount(postId);
    revalidateTag("latest-public-posts");
    return { ok: true, liked: !liked, count };
  } catch {
    return { ok: false, error: "좋아요 처리에 실패했습니다." };
  }
}
