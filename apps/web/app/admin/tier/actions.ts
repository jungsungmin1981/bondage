"use server";

import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import {
  getMemberProfileByUserId,
  getOperatorAllowedTabIds,
  getTierConditionsByTier,
  updateTierConditionThreshold,
  recalculateAllRiggerStars,
  updateRiggerTierAndStars,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { isOperatorAllowedPath } from "@/lib/admin-operator-permissions";
import { revalidatePath } from "next/cache";

async function checkAccess(path: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return false;
  if (isAdmin(session)) return true;
  const profile = await getMemberProfileByUserId(session.user.id);
  const isOperator = profile?.memberType === "operator" && profile?.status === "approved";
  if (!isOperator) return false;
  const allowedIds = await getOperatorAllowedTabIds(session.user.id);
  return isOperatorAllowedPath(allowedIds, path);
}

/** 브론즈 조건 임계값 수정 */
export async function updateConditionThresholdAction(
  id: string,
  threshold: number,
): Promise<{ ok: boolean; error?: string }> {
  const ok = await checkAccess("/admin/tier/conditions");
  if (!ok) return { ok: false, error: "권한이 없습니다." };
  if (threshold < 0) return { ok: false, error: "임계값은 0 이상이어야 합니다." };
  await updateTierConditionThreshold(id, threshold);
  revalidatePath("/admin/tier/conditions");
  return { ok: true };
}

/** 전체 리거 별 재계산 */
export async function recalculateAllStarsAction(): Promise<{
  ok: boolean;
  count?: number;
  error?: string;
}> {
  const ok = await checkAccess("/admin/tier/riggers");
  if (!ok) return { ok: false, error: "권한이 없습니다." };
  const count = await recalculateAllRiggerStars();
  revalidatePath("/admin/tier/riggers");
  return { ok: true, count };
}

/** 특정 리거 tier/stars 수동 변경 */
export async function updateRiggerTierAction(
  profileId: string,
  tier: string,
  stars: number,
): Promise<{ ok: boolean; error?: string }> {
  const ok = await checkAccess("/admin/tier/riggers");
  if (!ok) return { ok: false, error: "권한이 없습니다." };
  if (stars < 0 || stars > 5) return { ok: false, error: "별 수는 0~5 사이여야 합니다." };
  const validTiers = ["bronze", "silver", "gold", "legend"];
  if (!validTiers.includes(tier)) return { ok: false, error: "유효하지 않은 등급입니다." };
  await updateRiggerTierAndStars(profileId, tier, stars);
  revalidatePath("/admin/tier/riggers");
  return { ok: true };
}
