"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { approveOperatorProfile } from "@workspace/db";
import { isAdmin } from "@/lib/admin";

export async function approveOperatorProfileAction(
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 승인할 수 있습니다." };
  }
  const result = await approveOperatorProfile(profileId);
  if (result.ok) {
    // 승인된 운영진의 프로필 캐시를 즉시 무효화 (layout.tsx의 getCachedMemberProfile)
    revalidatePath("/", "layout");
    revalidatePath("/admin/invite-keys");
  }
  return result;
}
