"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  getBunnyProfileById,
  updateMemberProfile,
  type MemberProfileUpdate,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";

export async function saveBunnyProfile(
  profileId: string,
  data: MemberProfileUpdate,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const profile = await getBunnyProfileById(profileId);
  if (!profile) return { ok: false, error: "프로필을 찾을 수 없습니다." };
  const isOwner = profile.userId === session.user.id;
  const isAdminUser = isAdmin(session);
  if (!isOwner && !isAdminUser) {
    return { ok: false, error: "본인 프로필만 수정할 수 있습니다." };
  }
  const result = await updateMemberProfile(
    isAdminUser && !isOwner ? profile.userId : session.user.id,
    data,
  );
  if (result.ok) revalidatePath(`/bunnies/${encodeURIComponent(profileId)}`);
  return result;
}
