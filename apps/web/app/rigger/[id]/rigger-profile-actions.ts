"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { getRiggerIdForUserId } from "@/lib/rigger-sample";
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
  if (getRiggerIdForUserId(session.user.id) !== riggerId) {
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
    if (data.markImageUrl !== undefined) {
      let u = data.markImageUrl;
      // custom 마크는 동일 경로 덮어쓰기 → 캐시 무력화용 쿼리 없으면 붙임
      if (
        typeof u === "string" &&
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
