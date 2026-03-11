"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  getBunnyProfileById,
  updateMemberProfile,
  type MemberProfileUpdate,
} from "@workspace/db";

export async function saveBunnyProfile(
  profileId: string,
  data: MemberProfileUpdate,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const profile = await getBunnyProfileById(profileId);
  if (!profile || profile.userId !== session.user.id) {
    return { ok: false, error: "본인 프로필만 수정할 수 있습니다." };
  }
  const result = await updateMemberProfile(session.user.id, data);
  if (result.ok) revalidatePath(`/bunnies/${encodeURIComponent(profileId)}`);
  return result;
}
