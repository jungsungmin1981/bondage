"use server";

import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import sharp from "sharp";
import { saveWatermarkConfigToDB, type WatermarkConfig } from "@/lib/watermark-config";
import { uploadBufferToS3 } from "@/lib/s3-upload";
import { isAdmin } from "@/lib/admin";

export async function saveWatermarkConfig(
  data: WatermarkConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session)) return { ok: false, error: "권한이 없습니다." };

  try {
    await saveWatermarkConfigToDB(data);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "설정 저장에 실패했습니다." };
  }
}

export async function uploadWatermarkImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session)) return { ok: false, error: "권한이 없습니다." };

  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File))
    return { ok: false, error: "이미지 파일을 선택해 주세요." };
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type))
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .png()
      .toBuffer();
    const url = await uploadBufferToS3(
      `config/watermark.png`,
      resized,
      "image/png",
    );
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다." };
  }
}
