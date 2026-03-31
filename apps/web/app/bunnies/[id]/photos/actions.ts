"use server";

import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@workspace/auth";
import { db, schema, getActiveSuspensionForUser, getBunnyProfileById, deleteBunnyPostOwnedByUser, updateBunnyPostCaptionOwnedByUser, isBunnyPhotoLikedByUser, insertBunnyPhotoLike, deleteBunnyPhotoLike, getBunnyPhotoLikeCount, isBunnyPostOwnedByUser, getBunnyPhotoLikersWithNames } from "@workspace/db";
import { randomUUID } from "crypto";
import sharp from "sharp";
import {
  getWatermarkConfig,
} from "@/lib/watermark-config";
import { uploadBufferToS3 } from "@/lib/s3-upload";

const MAX_PHOTOS = 4;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
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
    const opacity = config.opacity ?? 0.6;

    if (config.type === "image" && config.imagePath) {
      let overlayBuf: Buffer | null = null;
      if (config.imagePath.startsWith("http")) {
        const res = await fetch(config.imagePath).catch(() => null);
        if (res?.ok) overlayBuf = Buffer.from(await res.arrayBuffer());
      } else {
        // 로컬 public 경로 fallback
        const { resolvePublicFileSync } = await import("@/lib/watermark-config");
        const fsPromises = await import("fs/promises");
        overlayBuf = await fsPromises.readFile(resolvePublicFileSync(config.imagePath)).catch(() => null);
      }
      if (!overlayBuf) return jpegBuffer;
      const scale = config.scale ?? 1;
      const overlayW = Math.max(16, Math.round(w * 0.18 * scale));
      const resized = await sharp(overlayBuf)
        .resize(overlayW, null, { withoutEnlargement: false })
        .ensureAlpha()
        .png()
        .toBuffer();

      // alpha 채널에 opacity 적용
      const { data, info } = await sharp(resized).raw().toBuffer({ resolveWithObject: true });
      for (let i = 3; i < data.length; i += 4) {
        data[i] = Math.round(data[i] * opacity);
      }
      const overlay = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 },
      }).png().toBuffer();

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
      const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="${x}" y="${y}" font-size="${fontSize}" fill="white" fill-opacity="${opacity}" text-anchor="middle" dominant-baseline="middle">${escapeXml(config.text.trim())}</text></svg>`;
      const overlay = await sharp(Buffer.from(svg)).png().toBuffer();
      return await sharp(jpegBuffer)
        .composite([{ input: overlay, left: 0, top: 0, blend: "over" }])
        .jpeg({ quality: SERVER_RESIZE.jpegQuality })
        .toBuffer();
    }
  } catch (e) {
    console.warn("[watermark] 오류 — 워터마크 없이 저장:", e instanceof Error ? e.message : e);
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

export async function uploadBunnyPhoto(
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

    const bunnyProfileId = formData.get("bunnyProfileId");
    const rawCaption = (formData.get("caption") ?? "") as string;
    const caption = rawCaption.trim().slice(0, 30) || null;

    if (!bunnyProfileId || typeof bunnyProfileId !== "string") {
      return { ok: false, error: "잘못된 요청입니다." };
    }

    const profile = await getBunnyProfileById(bunnyProfileId);
    if (!profile) return { ok: false, error: "프로필을 찾을 수 없습니다." };
    if (profile.userId !== session.user.id) {
      return { ok: false, error: "본인 프로필에만 사진을 등록할 수 있습니다." };
    }

    const files: (File | Blob)[] = [];
    for (let i = 0; i < MAX_PHOTOS; i++) {
      const f = formData.get(`image_${i}`);
      if (f instanceof File) files.push(f);
      else if (f && typeof f === "object" && "arrayBuffer" in f && typeof (f as Blob).arrayBuffer === "function") {
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

    // 여러 장을 하나의 게시물(postId)로 묶어 저장
    const postId = randomUUID();
    for (const file of files) {
      const originalExt = getExt(file);
      const arrayBuffer = await file.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      const { buffer: outputBuffer, ext } = await processImage(inputBuffer, originalExt);

      const fileName = `${Date.now()}-${randomUUID()}${ext}`;
      const s3Key = `uploads/bunny/${bunnyProfileId}/${fileName}`;
      const imageUrl = await uploadBufferToS3(s3Key, outputBuffer, "image/jpeg");

      await db.insert(schema.bunnyPhotos).values({
        id: randomUUID(),
        postId,
        bunnyProfileId,
        userId: session.user.id,
        imagePath: imageUrl,
        caption,
      });
    }

    revalidatePath(`/bunnies/${encodeURIComponent(bunnyProfileId)}`);
    revalidatePath(`/bunnies/${encodeURIComponent(bunnyProfileId)}/photos`);
    revalidateTag("latest-public-posts", "default");
    return { ok: true };
  } catch (e) {
    console.error("uploadBunnyPhoto error:", e);
    return { ok: false, error: "사진 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function deleteBunnyPost(
  bunnyProfileId: string,
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { ok: false, error: "로그인이 필요합니다." };

    const deletedCount = await deleteBunnyPostOwnedByUser(bunnyProfileId, postId, session.user.id);
    if (deletedCount === 0) {
      return { ok: false, error: "삭제할 게시물이 없거나 권한이 없습니다." };
    }
    revalidatePath(`/bunnies/${encodeURIComponent(bunnyProfileId)}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "삭제에 실패했습니다." };
  }
}

export async function updateBunnyPostCaption(
  bunnyProfileId: string,
  postId: string,
  caption: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { ok: false, error: "로그인이 필요합니다." };

    const trimmed = caption.trim().slice(0, 30) || null;
    const updatedCount = await updateBunnyPostCaptionOwnedByUser(
      bunnyProfileId,
      postId,
      session.user.id,
      trimmed,
    );
    if (updatedCount === 0) {
      return { ok: false, error: "수정할 게시물이 없거나 권한이 없습니다." };
    }
    revalidatePath(`/bunnies/${encodeURIComponent(bunnyProfileId)}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "저장에 실패했습니다." };
  }
}

export async function toggleBunnyPhotoLike(
  bunnyProfileId: string,
  photoId: string,
): Promise<{ ok: true; liked: boolean; count: number } | { ok: false; error: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { ok: false, error: "로그인이 필요합니다." };

    if (await isBunnyPostOwnedByUser(photoId, session.user.id)) {
      return { ok: false, error: "본인 게시물에는 좋아요할 수 없습니다." };
    }

    const liked = await isBunnyPhotoLikedByUser(photoId, session.user.id);
    if (liked) {
      await deleteBunnyPhotoLike(photoId, session.user.id);
    } else {
      await insertBunnyPhotoLike(randomUUID(), photoId, session.user.id);
    }
    const count = await getBunnyPhotoLikeCount(photoId);
    revalidatePath(`/bunnies/${encodeURIComponent(bunnyProfileId)}`);
    return { ok: true, liked: !liked, count };
  } catch {
    return { ok: false, error: "좋아요 처리에 실패했습니다." };
  }
}

export async function getBunnyPhotoLikers(
  photoId: string,
): Promise<{ ok: true; likers: Awaited<ReturnType<typeof getBunnyPhotoLikersWithNames>> } | { ok: false }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false };
  if (!(await isBunnyPostOwnedByUser(photoId, session.user.id))) return { ok: false };
  const likers = await getBunnyPhotoLikersWithNames(photoId);
  return { ok: true, likers };
}
