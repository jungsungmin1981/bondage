"use server";

import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import fs from "fs/promises";
import path from "path";
import {
  getPublicDirSync,
  type WatermarkConfig,
} from "@/lib/watermark-config";

function getConfigFilePath(): string {
  return path.join(getPublicDirSync(), "watermark-config.json");
}

function getWatermarkImagePath(): string {
  return path.join(getPublicDirSync(), "watermark.png");
}

export async function saveWatermarkConfig(
  data: WatermarkConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const filePath = getConfigFilePath();
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "설정 저장에 실패했습니다." };
  }
}

export async function uploadWatermarkImage(
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

  const filePath = getWatermarkImagePath();
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return { ok: true, url: "/watermark.png" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다." };
  }
}
