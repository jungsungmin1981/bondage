"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import type { ChallengeReviewPayload } from "@workspace/db";
import { submitChallengeReview, getMemberProfileByUserId } from "@workspace/db";
import { isPrimaryAdmin } from "@/lib/admin";
import { sendTelegramNotification } from "@/lib/telegram";

const LEVEL_LABEL: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("로그인이 필요합니다.");
  if (isPrimaryAdmin(session)) return session;
  const profile = await getMemberProfileByUserId(session.user.id);
  const isOperator = profile?.memberType === "operator" && profile?.status === "approved";
  if (!isOperator) throw new Error("관리자만 사용할 수 있습니다.");
  return session;
}

export async function updateChallengeStatusAction(
  challengeId: string,
  status: "approved" | "rejected",
  payload?: ChallengeReviewPayload,
  level?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await requireAdmin();
    const staffUserId = session?.user?.id;
    if (!staffUserId) throw new Error("로그인 정보가 없습니다.");
    await submitChallengeReview(challengeId, staffUserId, status, payload);

    const levelLabel = level ? (LEVEL_LABEL[level] ?? level) : "";
    const statusLabel = status === "approved" ? "✅ 승인" : "❌ 거절";
    await sendTelegramNotification(
      `🎓 <b>클래스 심사 완료</b>\n결과: ${statusLabel}${levelLabel ? `\n난이도: ${levelLabel}` : ""}\n👉 /admin/class-review${level ? `/${level}` : ""}`,
    );

    revalidatePath("/admin/class-review/beginner");
    revalidatePath("/admin/class-review/intermediate");
    revalidatePath("/admin/class-review/advanced");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "상태 변경에 실패했습니다.";
    return { ok: false, error: message };
  }
}
