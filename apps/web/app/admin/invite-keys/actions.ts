"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { approveOperatorProfile, approveOperatorProfileByUserId, getMemberProfileByUserId } from "@workspace/db";
import { isPrimaryAdmin } from "@/lib/admin";

async function checkIsAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if (isPrimaryAdmin(session)) return session;
  const profile = await getMemberProfileByUserId(session.user.id);
  if (profile?.memberType === "operator" && profile?.status === "approved") return session;
  return null;
}

export async function approveOperatorProfileAction(
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await checkIsAdmin();
  if (!session) {
    return { ok: false, error: "관리자만 승인할 수 있습니다." };
  }

  let result: { ok: true } | { ok: false; error: string };

  // 'no-profile-{userId}' 형태: member_profiles 없이 users.memberType='operator'인 케이스
  if (profileId.startsWith("no-profile-")) {
    const userId = profileId.replace("no-profile-", "");
    result = await approveOperatorProfileByUserId(userId);
  } else {
    result = await approveOperatorProfile(profileId);
  }

  if (result.ok) {
    // 승인된 운영진의 프로필 캐시를 즉시 무효화 (layout.tsx의 getCachedMemberProfile)
    revalidatePath("/", "layout");
    revalidatePath("/admin/invite-keys");
  }
  return result;
}
