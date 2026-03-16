"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  approveBunnyPostRequest,
  approveBunnyPostRequestAsAdmin,
  getPhotosByPostId,
  getPostIdsWhereUserIsRequestedBunny,
  rejectBunnyPostRequest,
  rejectBunnyPostRequestAsAdmin,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";

export async function getPostDetailForApproval(
  postId: string,
): Promise<
  | { ok: true; photos: { imagePath: string }[]; caption: string | null }
  | { ok: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  if (!isAdmin(session)) {
    const allowed = await getPostIdsWhereUserIsRequestedBunny(
      [postId],
      session.user.id,
    );
    if (!allowed.has(postId)) {
      return { ok: false, error: "해당 게시물을 볼 수 있는 권한이 없습니다." };
    }
  }

  const rows = await getPhotosByPostId(postId);
  const photos = rows.map((r) => ({ imagePath: r.imagePath }));
  const caption = rows[0]?.caption ?? null;
  return { ok: true, photos, caption };
}

export async function approveBunnyPost(
  approvalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  try {
    const result = isAdmin(session)
      ? await approveBunnyPostRequestAsAdmin(approvalId)
      : await approveBunnyPostRequest(approvalId, session.user.id);
    if (!result.ok) return result;
    if (result.riggerId) {
      revalidatePath(`/rigger/${encodeURIComponent(result.riggerId)}`);
      revalidatePath(`/rigger/${encodeURIComponent(result.riggerId)}/photos`);
    }
    revalidatePath("/bunny-approvals");
    return { ok: true };
  } catch {
    return { ok: false, error: "승인 처리에 실패했습니다." };
  }
}

export async function rejectBunnyPost(
  approvalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  try {
    const result = isAdmin(session)
      ? await rejectBunnyPostRequestAsAdmin(approvalId, session.user.id)
      : await rejectBunnyPostRequest(approvalId, session.user.id);
    if (!result.ok) return result;
    revalidatePath("/bunny-approvals");
    return { ok: true };
  } catch {
    return { ok: false, error: "거절 처리에 실패했습니다." };
  }
}
