"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  deleteRiggerPost,
  deleteRiggerPostOwnedByUser,
  updateRiggerPostVisibilityByPost,
  updateRiggerPostVisibilityOwnedByUser,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";

export async function deleteOwnRiggerPost(
  riggerId: string,
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  try {
    const deletedCount = isAdmin(session)
      ? await deleteRiggerPost(riggerId, postId)
      : await deleteRiggerPostOwnedByUser(
          riggerId,
          postId,
          session.user.id,
        );
    if (deletedCount === 0) {
      return { ok: false, error: "삭제할 게시물이 없거나 권한이 없습니다." };
    }

    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}`);
    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}/photos`);
    return { ok: true };
  } catch {
    return { ok: false, error: "삭제에 실패했습니다." };
  }
}

export async function updateOwnRiggerPostVisibility(
  riggerId: string,
  postId: string,
  visibility: "public" | "private",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  try {
    const updatedCount = isAdmin(session)
      ? await updateRiggerPostVisibilityByPost(riggerId, postId, visibility)
      : await updateRiggerPostVisibilityOwnedByUser(
          riggerId,
          postId,
          session.user.id,
          visibility,
        );
    if (updatedCount === 0) {
      return {
        ok: false,
        error: "변경할 게시물이 없거나 권한이 없거나, 승인 대기 중인 게시물입니다.",
      };
    }
    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}`);
    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}/photos`);
    return { ok: true };
  } catch {
    return { ok: false, error: "저장에 실패했습니다." };
  }
}

