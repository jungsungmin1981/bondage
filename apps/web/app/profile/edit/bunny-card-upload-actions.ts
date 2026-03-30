"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { getBunnyProfileById, updateMemberProfile } from "@workspace/db";
import { resizeToJpeg } from "@/lib/image/resize";
import { uploadBufferToS3 } from "@/lib/s3-upload";
import { isAdmin } from "@/lib/admin";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function safeProfileId(profileId: string): string {
  return profileId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * 버니 카드 이미지 업로드 → S3 marks/bunny/{profileId}.jpg 저장 후
 * member_profiles.card_image_url 업데이트.
 * 본인 또는 관리자만 가능.
 */
export async function uploadBunnyCardImage(
  profileId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const profile = await getBunnyProfileById(profileId);
  if (!profile) return { ok: false, error: "프로필을 찾을 수 없습니다." };

  const isOwner = profile.userId === session.user.id;
  if (!isOwner && !isAdmin(session)) {
    return { ok: false, error: "본인 또는 관리자만 수정할 수 있습니다." };
  }

  const file = formData.get("image");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "이미지 파일을 선택해 주세요." };
  }
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };
  }

  const key = `marks/bunny/${safeProfileId(profileId)}.jpg`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await resizeToJpeg(buffer);
    const url = await uploadBufferToS3(key, resized, "image/jpeg");
    // 관리자가 타인 프로필 수정 시 profile.userId 기준으로 업데이트
    const targetUserId = profile.userId;
    const result = await updateMemberProfile(targetUserId, {
      cardImageUrl: url,
    });
    if (!result.ok) return result;
    revalidatePath("/profile/edit");
    revalidatePath(`/bunnies/${encodeURIComponent(profileId)}`);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다.",
    };
  }
}
