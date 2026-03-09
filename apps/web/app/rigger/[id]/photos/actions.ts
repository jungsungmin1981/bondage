"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { db, schema } from "@workspace/db";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { getRiggerIdForUserId } from "@/lib/rigger-sample";

const UPLOAD_BASE_DIR = "public/uploads/rigger";
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

async function processImage(
  input: Buffer,
  originalExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  try {
    const size = SERVER_RESIZE.maxWidthOrHeight;
    const out = await sharp(input)
      .rotate()
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: SERVER_RESIZE.jpegQuality })
      .toBuffer();
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

    const riggerId = formData.get("riggerId");
    const rawCaption = (formData.get("caption") ?? "") as string;
    const caption = rawCaption.trim();

    if (!riggerId || typeof riggerId !== "string") {
      return { ok: false, error: "잘못된 요청입니다." };
    }
    if (!caption) {
      return { ok: false, error: "제목을 입력해 주세요." };
    }

    const ownRiggerId = getRiggerIdForUserId(session.user.id);
    if (ownRiggerId !== riggerId) {
      return { ok: false, error: "본인 프로필에만 사진을 등록할 수 있습니다." };
    }

    const files: (File | Blob)[] = [];
    for (let i = 0; i < MAX_PHOTOS; i++) {
      const f = formData.get(`image_${i}`);
      if (f instanceof File) files.push(f);
      else if (f && typeof (f as Blob).arrayBuffer === "function") files.push(f as Blob);
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

    const uploadDir = path.join(process.cwd(), UPLOAD_BASE_DIR, riggerId);
    const captionTrim = caption.slice(0, 30).trim() || null;
    const postId = randomUUID();

    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      const originalExt = getExt(file);
      const arrayBuffer = await file.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      const { buffer: outputBuffer, ext } = await processImage(inputBuffer, originalExt);

      const fileName = `${Date.now()}-${randomUUID()}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const publicPath = `/uploads/rigger/${encodeURIComponent(riggerId)}/${fileName}`;

      await fs.writeFile(filePath, outputBuffer);

      await db.insert(schema.riggerPhotos).values({
        id: randomUUID(),
        postId,
        riggerId,
        userId: session.user.id,
        imagePath: publicPath,
        caption: captionTrim,
      });
    }

    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}`);
    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}/photos`);
    return { ok: true };
  } catch (e) {
    console.error("uploadPhoto error:", e);
    return { ok: false, error: "사진 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
