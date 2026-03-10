"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  approveBunnyPostRequest,
  approveBunnyPostRequestAsAdmin,
  rejectBunnyPostRequest,
  rejectBunnyPostRequestAsAdmin,
} from "@workspace/db";

export async function approveBunnyPost(
  approvalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin =
      typeof adminEmail === "string" &&
      adminEmail.length > 0 &&
      session.user.email === adminEmail;

    const result = isAdmin
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
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin =
      typeof adminEmail === "string" &&
      adminEmail.length > 0 &&
      session.user.email === adminEmail;

    const result = isAdmin
      ? await rejectBunnyPostRequestAsAdmin(approvalId)
      : await rejectBunnyPostRequest(approvalId, session.user.id);
    if (!result.ok) return result;
    revalidatePath("/bunny-approvals");
    return { ok: true };
  } catch {
    return { ok: false, error: "거절 처리에 실패했습니다." };
  }
}
