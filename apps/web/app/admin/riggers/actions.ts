"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  approveRiggerProfile as dbApproveRiggerProfile,
  rejectRiggerProfile as dbRejectRiggerProfile,
  getUserIdByMemberProfileId,
  insertDirectMessage,
  DIRECT_MESSAGE_SOURCE,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";

export async function approveRiggerProfileAction(profileId: string): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 승인할 수 있습니다." };
  }
  const result = await dbApproveRiggerProfile(profileId);
  if (result.ok) {
    revalidatePath("/", "layout");
    revalidatePath("/admin/riggers");
  }
  return result;
}

export async function rejectRiggerProfileWithNoteAction(
  profileId: string,
  title: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 반려할 수 있습니다." };
  }
  if (!session?.user?.id) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  const toUserId = await getUserIdByMemberProfileId(profileId);
  if (!toUserId) {
    return { ok: false, error: "해당 리거를 찾을 수 없습니다." };
  }
  const titleTrimmed = title.trim();
  const contentTrimmed = content.trim();
  const messageBody = [titleTrimmed, contentTrimmed].filter(Boolean).join("\n\n") || "리거 승인이 반려되었습니다.";
  try {
    await insertDirectMessage({
      fromUserId: session.user.id,
      toUserId,
      title: titleTrimmed || null,
      body: contentTrimmed || "리거 승인이 반려되었습니다.",
      source: DIRECT_MESSAGE_SOURCE.RIGGER_REJECTION,
    });
  } catch {
    return { ok: false, error: "쪽지 전송에 실패했습니다." };
  }
  const rejectResult = await dbRejectRiggerProfile(profileId, messageBody);
  if (!rejectResult.ok) return rejectResult;
  revalidatePath("/admin/riggers");
  return { ok: true };
}
