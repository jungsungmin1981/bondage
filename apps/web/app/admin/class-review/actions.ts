"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import type { ChallengeReviewPayload } from "@workspace/db";
import { submitChallengeReview } from "@workspace/db";
import { isAdmin } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session)) throw new Error("관리자만 사용할 수 있습니다.");
  return session;
}

export async function updateChallengeStatusAction(
  challengeId: string,
  status: "approved" | "rejected",
  payload?: ChallengeReviewPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await requireAdmin();
    const staffUserId = session?.user?.id;
    if (!staffUserId) throw new Error("로그인 정보가 없습니다.");
    await submitChallengeReview(challengeId, staffUserId, status, payload);
    revalidatePath("/admin/class-review/beginner");
    revalidatePath("/admin/class-review/intermediate");
    revalidatePath("/admin/class-review/advanced");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "상태 변경에 실패했습니다.";
    return { ok: false, error: message };
  }
}
