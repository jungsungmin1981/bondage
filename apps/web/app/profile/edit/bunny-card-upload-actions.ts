"use server";

import { headers } from "next/headers";
import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { getBunnyProfileById, updateMemberProfile } from "@workspace/db";
import { getPublicDirSync } from "@/lib/watermark-config";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function bunnyCardFileName(profileId: string, mime: string): string {
  const safe = profileId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return `bunny-${safe}.${ext}`;
}

/**
 * 본인 버니 카드 이미지 업로드 → public/marks/bunny-{profileId}.{ext} 저장 후
 * member_profiles.card_image_url 업데이트.
 */
export async function uploadBunnyCardImage(
  profileId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const profile = await getBunnyProfileById(profileId);
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
  const name = bunnyCardFileName(profileId, file.type);
  const filePath = path.join(marksDir, name);
  const url = `/marks/${name}?t=${Date.now()}`;

  try {
    await fs.mkdir(marksDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다.",
    };
  }

  const result = await updateMemberProfile(session.user.id, {
    cardImageUrl: url,
  });
  if (!result.ok) return result;
  revalidatePath("/profile/edit");
  revalidatePath(`/bunnies/${encodeURIComponent(profileId)}`);
  revalidatePath("/", "layout");
  return { ok: true };
}
