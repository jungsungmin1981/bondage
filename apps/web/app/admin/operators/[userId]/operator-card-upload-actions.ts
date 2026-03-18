"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { getMemberProfileByUserId, updateMemberProfile } from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { resizeToJpeg } from "@/lib/image/resize";
import { uploadBufferToS3 } from "@/lib/s3-upload";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * 운영진 카드 이미지 업로드 → S3 marks/operator/{userId}.jpg 저장 후
 * member_profiles.card_image_url 업데이트.
 * 본인 또는 관리자만 호출 가능.
 */
export async function uploadOperatorCardImage(
  targetUserId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const isSelf = session.user.id === targetUserId;
  if (!isSelf && !isAdmin(session)) {
    return { ok: false, error: "본인 또는 관리자만 수정할 수 있습니다." };
  }

  const profile = await getMemberProfileByUserId(targetUserId);
  if (!profile || profile.memberType !== "operator") {
    return { ok: false, error: "해당 운영진 프로필을 찾을 수 없습니다." };
  }

  const file = formData.get("image");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "이미지 파일을 선택해 주세요." };
  }
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };
  }

  const key = `marks/operator/${safeUserId(targetUserId)}.jpg`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await resizeToJpeg(buffer);
    const url = await uploadBufferToS3(key, resized, "image/jpeg");
    const result = await updateMemberProfile(targetUserId, {
      cardImageUrl: url,
    });
    if (!result.ok) return result;
    revalidatePath(`/admin/operators/${encodeURIComponent(targetUserId)}`);
    revalidatePath("/admin/operators");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다.",
    };
  }
}
