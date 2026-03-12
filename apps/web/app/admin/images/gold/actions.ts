"use server";

import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import fs from "fs/promises";
import path from "path";
import { resolvePublicFileSync } from "@/lib/watermark-config";
import { resizeCardToPng } from "@/lib/image/resize";

function getGoldCardImagePath(): string {
  return resolvePublicFileSync("/rigger-card-gold.png");
}

export async function uploadGoldCardImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File))
    return { ok: false, error: "이미지 파일을 선택해 주세요." };

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type))
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };

  const filePath = getGoldCardImagePath();
  const dir = path.dirname(filePath);

  try {
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await resizeCardToPng(buffer);
    await fs.writeFile(filePath, resized);
    return { ok: true, url: "/rigger-card-gold.png" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다.",
    };
  }
}

