"use server";

import { headers } from "next/headers";
import fs from "fs/promises";
import path from "path";
import { auth } from "@workspace/auth";
import { getRiggerProfileById } from "@workspace/db";
import { getPublicDirSync } from "@/lib/watermark-config";
import { resizeToJpeg } from "@/lib/image/resize";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** public/marks 아래 안전한 파일명 (rigger id + 확장자) */
function markFileName(riggerId: string): string {
  const safe = riggerId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `custom-${safe}.jpg`;
}

/**
 * 본인 리거 마크용 이미지 업로드 → public/marks/custom-{id}.png 로 저장
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

  const publicDir = getPublicDirSync();
  const marksDir = path.join(publicDir, "marks");
  const name = markFileName(riggerId);
  const filePath = path.join(marksDir, name);
  const url = `/marks/${name}`;

  try {
    await fs.mkdir(marksDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await resizeToJpeg(buffer);
    await fs.writeFile(filePath, resized);
    // 동일 경로 덮어쓰기 시 브라우저 캐시로 예전 이미지가 보이는 것 방지
    const urlWithBust = `${url}?t=${Date.now()}`;
    return { ok: true, url: urlWithBust };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다.",
    };
  }
}
