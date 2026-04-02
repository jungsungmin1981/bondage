"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import {
  createBunnyProfile,
  createOperatorProfile,
  createRiggerProfile,
  setUserMemberType,
} from "@workspace/db";
import { revalidatePath } from "next/cache";
import { sendTelegramNotification } from "@/lib/telegram";

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
  await sendTelegramNotification(
    `🐰 <b>버니 회원 가입 완료</b>\n닉네임: ${data.nickname}\n성별: ${data.gender ?? "-"}\n지역: ${data.activityRegion ?? "-"}`,
  );
  revalidatePath("/", "layout");
  revalidatePath("/bunnies");
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
  await sendTelegramNotification(
    `🔔 <b>리거 승인 요청 (신규)</b>\n닉네임: ${data.nickname}\n👉 /admin/riggers`,
  );
  revalidatePath("/", "layout");
  revalidatePath("/rigger");
  redirect(`/rigger/${result.profileId}`);
}

export type OperatorFormValues = { nickname: string; bio: string | null };

export async function submitOperatorProfile(
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: OperatorFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  const nickname = (formData.get("nickname") as string | null)?.trim() ?? "";
  const bio = (formData.get("bio") as string | null)?.trim() || null;
  if (!nickname)
    return { ok: false, error: "닉네임을 입력해 주세요.", values: { nickname, bio } };
  if (!bio)
    return { ok: false, error: "자기소개를 입력해 주세요.", values: { nickname, bio } };
  const result = await createOperatorProfile(session.user.id, { nickname, bio });
  if (!result.ok) return result;
  await setUserMemberType(session.user.id, "operator");
  revalidatePath("/", "layout");
  redirect("/admin/pending");
}
