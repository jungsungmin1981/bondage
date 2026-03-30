"use server";

import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@workspace/auth";
import {
  db,
  schema,
  getActiveSuspensionForUser,
  getUserIdListByEmails,
  getRiggerProfileByUserId,
} from "@workspace/db";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import sharp from "sharp";
import {
  getWatermarkConfig,
  resolvePublicFileSync,
} from "@/lib/watermark-config";
import { uploadBufferToS3 } from "@/lib/s3-upload";
const MAX_PHOTOS = 4;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB (압축 후 여유 있게)

const SERVER_RESIZE = { maxWidthOrHeight: 1280, jpegQuality: 82 };

function getExt(file: File | Blob): string {
  const type = file.type;
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/jpeg" || type === "image/jpg") return ".jpg";
  const name = (file as File & { name?: string }).name;
  if (typeof name === "string" && name.includes(".")) {
    return "." + name.split(".").pop()!.toLowerCase();
  }
  return ".jpg";
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function applyWatermark(jpegBuffer: Buffer): Promise<Buffer> {
  try {
    const config = await getWatermarkConfig();
    const meta = await sharp(jpegBuffer).metadata();
    const w = meta.width ?? 1280;
    const h = meta.height ?? 720;

    if (config.type === "image" && config.imagePath) {
      const rel = config.imagePath.replace(/^\//, "");
      const overlayPath = resolvePublicFileSync(rel);
      const overlayBuf = await fs.readFile(overlayPath).catch(() => null);
      if (!overlayBuf) {
        console.warn(
          "[watermark] 오버레이 이미지를 읽을 수 없습니다:",
          overlayPath,
        );
        return jpegBuffer;
      }
      const scale = config.scale ?? 1;
      const overlayW = Math.max(16, Math.round(w * 0.18 * scale));
      const overlay = await sharp(overlayBuf)
        .resize(overlayW, null, { withoutEnlargement: false })
        .ensureAlpha()
        .png()
        .toBuffer();
      const om = await sharp(overlay).metadata();
      const ow = om.width ?? 0;
      const oh = om.height ?? 0;
      const left = Math.max(0, Math.round(w * config.positionX - ow / 2));
      const top = Math.max(0, Math.round(h * config.positionY - oh / 2));
      return await sharp(jpegBuffer)
        .composite([{ input: overlay, left, top, blend: "over" }])
        .jpeg({ quality: SERVER_RESIZE.jpegQuality })
        .toBuffer();
    }

    if (config.type === "text" && config.text?.trim()) {
      const fontSize = Math.max(12, Math.round(22 * (config.scale ?? 1)));
      const x = Math.round(w * config.positionX);
      const y = Math.round(h * config.positionY);
      const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="${x}" y="${y}" font-size="${fontSize}" fill="white" fill-opacity="${config.opacity}" text-anchor="middle" dominant-baseline="middle">${escapeXml(config.text.trim())}</text></svg>`;
      const overlay = await sharp(Buffer.from(svg)).png().toBuffer();
      return await sharp(jpegBuffer)
        .composite([{ input: overlay, left: 0, top: 0, blend: "over" }])
        .jpeg({ quality: SERVER_RESIZE.jpegQuality })
        .toBuffer();
    }
  } catch (e) {
    console.warn(
      "[watermark] 합성 중 오류 — 워터마크 없이 저장:",
      e instanceof Error ? e.message : e,
    );
  }
  return jpegBuffer;
}

async function processImage(
  input: Buffer,
  originalExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  try {
    const size = SERVER_RESIZE.maxWidthOrHeight;
    let out = await sharp(input)
      .rotate()
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: SERVER_RESIZE.jpegQuality })
      .toBuffer();
    out = await applyWatermark(out);
    return { buffer: out, ext: ".jpg" };
  } catch {
    return { buffer: input, ext: originalExt };
  }
}

export async function uploadPhoto(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) return { ok: false, error: "로그인이 필요합니다." };

    const suspension = await getActiveSuspensionForUser(session.user.id);
    if (suspension) {
      return { ok: false, error: "계정 사용 제한 중에는 이용할 수 없습니다." };
    }

    const riggerId = formData.get("riggerId");
    const rawCaption = (formData.get("caption") ?? "") as string;
    const caption = rawCaption.trim();
    const rawVisibility = (formData.get("visibility") ?? "") as string;
    const rawModel = (formData.get("model") ?? "") as string;
    const model =
      rawModel === "bunny" || rawModel === "object" || rawModel === "self"
        ? rawModel
        : null;
    const bunnyEmails = (formData.getAll("bunnyEmail") as string[]).filter(
      (e): e is string => typeof e === "string" && e.trim().length > 0,
    );

    if (!riggerId || typeof riggerId !== "string") {
      return { ok: false, error: "잘못된 요청입니다." };
    }
    if (!caption) {
      return { ok: false, error: "제목을 입력해 주세요." };
    }
    if (model === "bunny" && bunnyEmails.length === 0) {
      return { ok: false, error: "버니를 1명 이상 선택해 주세요." };
    }

    // 기본 공개/비공개는 폼 값 사용.
    // 단, 모델이 버니인 경우에는 버니 승인 전까지 항상 승인대기(pending) 상태로 유지한다.
    let visibility: "public" | "private" | "pending" =
      rawVisibility === "private" ? "private" : "public";
    const visibilityAfterApproval: "public" | "private" | null =
      model === "bunny"
        ? rawVisibility === "private"
          ? "private"
          : "public"
        : null;
    if (model === "bunny") {
      visibility = "pending";
    }

    const myRigger = await getRiggerProfileByUserId(session.user.id);
    const ownRiggerId = myRigger?.id ?? null;
    if (ownRiggerId !== riggerId) {
      return { ok: false, error: "본인 프로필에만 사진을 등록할 수 있습니다." };
    }

    const files: (File | Blob)[] = [];
    for (let i = 0; i < MAX_PHOTOS; i++) {
      const f = formData.get(`image_${i}`);
      if (f instanceof File) {
        files.push(f);
      } else if (
        f !== null &&
        typeof f === "object" &&
        "arrayBuffer" in f &&
        typeof (f as Blob).arrayBuffer === "function"
      ) {
        files.push(f as Blob);
      }
    }

    if (files.length === 0) {
      return { ok: false, error: "이미지 파일을 선택해 주세요." };
    }
    if (files.length > MAX_PHOTOS) {
      return { ok: false, error: `최대 ${MAX_PHOTOS}장까지 등록할 수 있습니다.` };
    }

    for (const file of files) {
      const type = (file as File).type ?? "";
      if (!ALLOWED_TYPES.includes(type) && !type.startsWith("image/")) {
        return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };
      }
      if (file.size > MAX_SIZE) {
        return { ok: false, error: "파일당 최대 10MB까지 업로드할 수 있습니다." };
      }
    }

    const captionTrim = caption.slice(0, 30).trim() || null;
    const postId = randomUUID();

    for (const file of files) {
      const originalExt = getExt(file);
      const arrayBuffer = await file.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      const { buffer: outputBuffer, ext } = await processImage(inputBuffer, originalExt);

      const fileName = `${Date.now()}-${randomUUID()}${ext}`;
      const s3Key = `uploads/rigger/${riggerId}/${fileName}`;
      const imageUrl = await uploadBufferToS3(s3Key, outputBuffer, "image/jpeg");

      await db.insert(schema.riggerPhotos).values({
        id: randomUUID(),
        postId,
        riggerId,
        userId: session.user.id,
        imagePath: imageUrl,
        caption: captionTrim,
        visibility,
        visibilityAfterApproval,
      });
    }

    if (model === "bunny" && bunnyEmails.length > 0) {
      const bunnyUserIds = await getUserIdListByEmails(bunnyEmails);
      for (const bunnyUserId of bunnyUserIds) {
        await db.insert(schema.bunnyApprovals).values({
          id: randomUUID(),
          postId,
          bunnyUserId,
          status: "pending",
        });
      }
    }

    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}`);
    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}/photos`);
    revalidateTag("latest-public-posts", "default");
    return { ok: true };
  } catch (e) {
    console.error("uploadPhoto error:", e);
    return { ok: false, error: "사진 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
