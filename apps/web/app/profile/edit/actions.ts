"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  getMemberProfileByUserId,
  updateMemberProfile,
  type MemberProfileUpdate,
} from "@workspace/db";

export async function saveProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const profile = await getMemberProfileByUserId(session.user.id);
  if (!profile) return { ok: false, error: "프로필이 없습니다. 온보딩을 먼저 완료해 주세요." };

  const nickname = formData.get("nickname");
  const iconUrl = formData.get("iconUrl");
  const bio = formData.get("bio");
  const gender = formData.get("gender");
  const division = formData.get("division");
  const bunnyRecruit = formData.get("bunnyRecruit");
  const bondageRating = formData.get("bondageRating");
  const activityRegion = formData.get("activityRegion");
  const style = formData.get("style");

  const data: MemberProfileUpdate = {};
  if (typeof nickname === "string") data.nickname = nickname;
  if (iconUrl !== undefined)
    data.iconUrl = typeof iconUrl === "string" ? iconUrl : null;
  if (bio !== undefined) data.bio = typeof bio === "string" ? bio : null;
  if (gender !== undefined)
    data.gender = typeof gender === "string" && gender.trim() ? gender.trim() : null;
  if (division !== undefined)
    data.division = typeof division === "string" ? division : null;
  if (bunnyRecruit !== undefined)
    data.bunnyRecruit = typeof bunnyRecruit === "string" ? bunnyRecruit : null;
  if (bondageRating !== undefined)
    data.bondageRating =
      typeof bondageRating === "string" ? bondageRating : null;
  if (activityRegion !== undefined)
    data.activityRegion =
      typeof activityRegion === "string" ? activityRegion : null;
  if (style !== undefined) data.style = typeof style === "string" ? style : null;

  if (data.nickname !== undefined && !data.nickname?.trim())
    return { ok: false, error: "닉네임을 입력해 주세요." };
  if (!data.gender || (data.gender !== "남" && data.gender !== "여"))
    return { ok: false, error: "성별을 선택해 주세요." };
  if (data.activityRegion !== undefined && !data.activityRegion?.trim())
    return { ok: false, error: "활동지역을 입력해 주세요." };
  if (data.style !== undefined && !data.style?.trim())
    return { ok: false, error: "스타일을 하나 이상 선택해 주세요." };
  if (data.bio !== undefined && !data.bio?.trim())
    return { ok: false, error: "자기소개를 입력해 주세요." };

  const result = await updateMemberProfile(session.user.id, data);
  if (result.ok) revalidatePath("/profile/edit");
  return result;
}
