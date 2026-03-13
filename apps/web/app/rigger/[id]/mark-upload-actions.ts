"use server";

import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { getRiggerProfileById } from "@workspace/db";
import { resizeToJpeg } from "@/lib/image/resize";
import { uploadBufferToS3 } from "@/lib/s3-upload";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** S3 키용 안전한 리거 id (파일명 규칙과 동일) */
function safeRiggerId(riggerId: string): string {
  return riggerId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * 본인 리거 마크용 이미지 업로드 → S3 marks/rigger/{riggerId}.jpg 저장
 * 반환 URL로 override.markImageUrl 저장하면 됨.
 */
export async function uploadRiggerMarkImage(
  riggerId: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const profile = await getRiggerProfileById(riggerId);
  if (!profile || profile.userId !== session.user.id) {
    return { ok: false, error: "본인 프로필만 수정할 수 있습니다." };
  }

  const file = formData.get("image");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "이미지 파일을 선택해 주세요." };
  }
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };
  }

  const key = `marks/rigger/${safeRiggerId(riggerId)}.jpg`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await resizeToJpeg(buffer);
    const url = await uploadBufferToS3(key, resized, "image/jpeg");
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다.",
    };
  }
}
