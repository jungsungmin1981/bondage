"use server";

import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { auth } from "@workspace/auth";
import {
  // 리거 포스트용
  deletePostLike,
  getPostLikeCount,
  insertPostLike,
  isPostLikedByUser,
  isPostOwnedByUser,
  // 버니 포스트용
  isBunnyPostOwnedByUser,
  getRepresentativeBunnyPhotoId,
  isBunnyPhotoLikedByUser,
  insertBunnyPhotoLike,
  deleteBunnyGroupLikes,
  getBunnyGroupLikeCount,
} from "@workspace/db";
import { randomUUID } from "crypto";

/**
 * 최신 게시물 페이지용 좋아요 토글.
 * - 리거 포스트: post_likes 테이블 사용 (리거 프로필 페이지와 공유)
 * - 버니 포스트: bunny_photo_likes 테이블 사용 (버니 프로필 페이지와 공유)
 */
export async function toggleLatestPostLike(
  postId: string,
  authorType: "rigger" | "bunny",
): Promise<{ ok: true; liked: boolean; count: number } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  try {
    if (authorType === "bunny") {
      // ── 버니 포스트 ──────────────────────────────────────────
      if (await isBunnyPostOwnedByUser(postId, session.user.id)) {
        return { ok: false, error: "본인 게시물에는 좋아요할 수 없습니다." };
      }
      const representativePhotoId = await getRepresentativeBunnyPhotoId(postId);
      if (!representativePhotoId) {
        return { ok: false, error: "게시물을 찾을 수 없습니다." };
      }
      // 그룹 내 어느 사진이라도 좋아요 했으면 "이미 좋아요" 처리
      const liked = await isBunnyPhotoLikedByUser(representativePhotoId, session.user.id);
      if (liked) {
        // 그룹 전체 좋아요 삭제
        await deleteBunnyGroupLikes(postId, session.user.id);
      } else {
        await insertBunnyPhotoLike(randomUUID(), representativePhotoId, session.user.id);
      }
      const count = await getBunnyGroupLikeCount(postId);
      revalidateTag("latest-public-posts", "default");
      return { ok: true, liked: !liked, count };
    } else {
      // ── 리거 포스트 ──────────────────────────────────────────
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
      revalidateTag("latest-public-posts", "default");
      return { ok: true, liked: !liked, count };
    }
  } catch {
    return { ok: false, error: "좋아요 처리에 실패했습니다." };
  }
}
