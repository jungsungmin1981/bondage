"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import {
  createBunnyProfile,
  createRiggerProfile,
  setUserMemberType,
} from "@workspace/db";
import { revalidatePath } from "next/cache";

function parseProfileFormData(formData: FormData): {
  nickname: string;
  iconUrl: string | null;
  bio: string | null;
  gender: string | null;
  division: string | null;
  bunnyRecruit: string | null;
  bondageRating: string | null;
  activityRegion: string | null;
  style: string | null;
} {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() || null : null;
  };
  return {
    nickname: get("nickname") ?? "",
    iconUrl: get("iconUrl"),
    bio: get("bio"),
    gender: get("gender"),
    division: get("division"),
    bunnyRecruit: get("bunnyRecruit"),
    bondageRating: get("bondageRating"),
    activityRegion: get("activityRegion"),
    style: get("style"),
  };
}

/** 검증 실패 시 폼에 다시 채우기 위해 제출값 반환 */
export type ProfileFormValues = ReturnType<typeof parseProfileFormData>;

export async function submitBunnyProfile(
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: ProfileFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  const data = parseProfileFormData(formData);
  if (!data.nickname?.trim())
    return { ok: false, error: "닉네임을 입력해 주세요.", values: data };
  if (data.gender !== "남" && data.gender !== "여")
    return { ok: false, error: "성별을 선택해 주세요.", values: data };
  if (!data.activityRegion?.trim())
    return { ok: false, error: "활동지역을 입력해 주세요.", values: data };
  if (!data.bio?.trim())
    return { ok: false, error: "자기소개를 입력해 주세요.", values: data };
  const result = await createBunnyProfile(session.user.id, data);
  if (!result.ok) return result;
  await setUserMemberType(session.user.id, "bunny");
  revalidatePath("/", "layout");
  redirect("/");
}

export async function submitRiggerProfile(
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: ProfileFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  const data = parseProfileFormData(formData);
  if (!data.nickname?.trim())
    return { ok: false, error: "닉네임을 입력해 주세요.", values: data };
  if (data.gender !== "남" && data.gender !== "여")
    return { ok: false, error: "성별을 선택해 주세요.", values: data };
  if (!data.activityRegion?.trim())
    return { ok: false, error: "활동지역을 입력해 주세요.", values: data };
  if (!data.style?.trim())
    return { ok: false, error: "스타일을 하나 이상 선택해 주세요.", values: data };
  if (!data.bio?.trim())
    return { ok: false, error: "자기소개를 입력해 주세요.", values: data };
  const result = await createRiggerProfile(session.user.id, data);
  if (!result.ok) return result;
  await setUserMemberType(session.user.id, "rigger");
  revalidatePath("/", "layout");
  redirect(`/rigger/${result.profileId}`);
}
