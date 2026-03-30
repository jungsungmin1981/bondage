"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  deletePostLike,
  getPostLikeCount,
  getPostLikersWithNames,
  insertPostLike,
  isPostLikedByUser,
  isPostOwnedByUser,
  getRiggerProfileById,
  recalculateRiggerStars,
} from "@workspace/db";
import { randomUUID } from "crypto";

export async function togglePostLike(
  riggerId: string,
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
    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}`);

    // 좋아요 변경 시 리거 별 자동 재계산 (비동기, 실패해도 무시)
    getRiggerProfileById(riggerId).then((profile) => {
      if (profile?.userId) {
        recalculateRiggerStars(riggerId, profile.userId).catch(() => {});
      }
    }).catch(() => {});

    return { ok: true, liked: !liked, count };
  } catch {
    return { ok: false, error: "좋아요 처리에 실패했습니다." };
  }
}

/** 본인 게시물일 때만 좋아요 누른 사람 목록 반환 */
export async function getPostLikers(
  postId: string,
): Promise<{ ok: true; likers: Awaited<ReturnType<typeof getPostLikersWithNames>> } | { ok: false }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false };
  if (!(await isPostOwnedByUser(postId, session.user.id))) return { ok: false };
  const likers = await getPostLikersWithNames(postId);
  return { ok: true, likers };
}
