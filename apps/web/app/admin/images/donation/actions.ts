"use server";

import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import fs from "fs/promises";
import path from "path";
import { resolvePublicFileSync } from "@/lib/watermark-config";
import {
  resizeToCardAspectPng,
  resizeToCardAspectGif,
} from "@/lib/image/resize";

const DONATION_CARD_PNG = "/donation-card.png";
const DONATION_CARD_GIF = "/donation-card.gif";

export async function uploadDonationCardImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File))
    return { ok: false, error: "이미지 파일을 선택해 주세요." };

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type))
    return { ok: false, error: "JPEG, PNG, WebP, GIF만 업로드할 수 있습니다." };

  const isGif = file.type === "image/gif";
  const filename = isGif ? DONATION_CARD_GIF : DONATION_CARD_PNG;
  const filePath = resolvePublicFileSync(filename);
  const dir = path.dirname(filePath);

  try {
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = isGif
      ? await resizeToCardAspectGif(buffer)
      : await resizeToCardAspectPng(buffer);
    await fs.writeFile(filePath, resized);
    return { ok: true, url: filename };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다.",
    };
  }
}
