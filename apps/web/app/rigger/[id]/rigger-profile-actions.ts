"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  getRiggerProfileById,
  requestRiggerApprovalAgain,
} from "@workspace/db";
import {
  saveRiggerOverride,
  type RiggerOverride,
} from "@/lib/rigger-overrides";

export async function saveRiggerProfile(
  riggerId: string,
  data: RiggerOverride,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const profile = await getRiggerProfileById(riggerId);
  if (!profile || profile.userId !== session.user.id) {
    return { ok: false, error: "본인 프로필만 수정할 수 있습니다." };
  }
  try {
    // undefined로 넘기면 병합 시 제외 — 기존 필드 유지.
    // 구분 등은 항상 명시적 문자열로 저장해야 다음 요청에서 덮어써짐.
    const patch: RiggerOverride = {};
    if (data.division != null && data.division !== "")
      patch.division = data.division;
    if (data.bunnyRecruit != null && data.bunnyRecruit !== "")
      patch.bunnyRecruit = data.bunnyRecruit;
    if (data.bondageRating != null && data.bondageRating !== "")
      patch.bondageRating = data.bondageRating;
    if (data.activityRegion !== undefined)
      patch.activityRegion = data.activityRegion;
    if (data.style !== undefined) patch.style = data.style;
    if (data.bio !== undefined) patch.bio = data.bio;
    if (data.profileVisibility !== undefined)
      patch.profileVisibility = data.profileVisibility;
    if (data.markImageUrl !== undefined) {
      let u = data.markImageUrl;
      // S3 등 절대 URL이면 쿼리 추가 스킵. 상대 경로(custom 마크)일 때만 캐시 무력화
      if (
        typeof u === "string" &&
        !u.startsWith("http://") &&
        !u.startsWith("https://") &&
        u.includes("/marks/custom-") &&
        !u.includes("?")
      ) {
        u = `${u}?t=${Date.now()}`;
      }
      patch.markImageUrl = u;
    }
    await saveRiggerOverride(riggerId, patch);
    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "저장에 실패했습니다." };
  }
}

export async function requestRiggerApprovalAgainAction(
  riggerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const profile = await getRiggerProfileById(riggerId);
  if (!profile || profile.userId !== session.user.id) {
    return { ok: false, error: "본인 프로필만 승인 재요청할 수 있습니다." };
  }
  if (profile.status !== "rejected") {
    return { ok: false, error: "반려된 상태에서만 다시 승인을 요청할 수 있습니다." };
  }
  const result = await requestRiggerApprovalAgain(riggerId);
  if (result.ok) {
    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}`);
  }
  return result;
}
