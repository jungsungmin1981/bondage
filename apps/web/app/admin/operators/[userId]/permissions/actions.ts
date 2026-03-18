"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { isAdmin } from "@/lib/admin";
import {
  getMemberProfileByUserId,
  setOperatorAllowedTabs,
  isValidOperatorTabOrSubId,
} from "@workspace/db";

export async function saveOperatorPermissionsAction(
  targetUserId: string,
  tabIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  if (!isAdmin(session)) return { ok: false, error: "관리자만 권한을 설정할 수 있습니다." }

  const profile = await getMemberProfileByUserId(targetUserId);
  const isApprovedOperator =
    profile?.memberType === "operator" && profile?.status === "approved";
  if (!isApprovedOperator) {
    return { ok: false, error: "승인된 운영진만 메뉴 권한을 설정할 수 있습니다." };
  }

  const validTabIds = tabIds.filter((id) => isValidOperatorTabOrSubId(id));
  await setOperatorAllowedTabs(targetUserId, validTabIds);
  revalidatePath("/admin/operators");
  revalidatePath("/admin/operator-permissions");
  revalidatePath("/admin/operators/[userId]/permissions");
  return { ok: true };
}
