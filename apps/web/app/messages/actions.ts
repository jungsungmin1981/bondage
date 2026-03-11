"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  ensureOneToOneThread,
  insertMessage,
} from "@workspace/db";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

const UPLOAD_BASE_DIR = "public/uploads/messages";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
// 원본 입력은 더 크게 받되, sharp로 최종 산출물을 줄인다.
// (클라이언트 압축이 실패했거나, 큰 원본 업로드도 허용하기 위함)
const MAX_ORIGINAL_SIZE = 60 * 1024 * 1024; // 60MB
const SERVER_RESIZE = { maxWidthOrHeight: 1280, jpegQuality: 82 };
const WS_PUBLISH_URL = process.env.WS_PUBLISH_URL || "http://localhost:3001/publish";
const WS_PUBLISH_SECRET = process.env.WS_PUBLISH_SECRET || process.env.BETTER_AUTH_SECRET || "dev-secret";

function getFileName(file: File): string {
  return (file as File & { name?: string }).name ?? "";
}

function getMimeType(file: File): string {
  return (file.type ?? "").toLowerCase();
}

function getNameExt(file: File): string {
  const name = getFileName(file);
  const ext = name.includes(".") ? "." + name.split(".").pop()!.toLowerCase() : "";
  return ext;
}

function getExt(file: File): string {
  const type = getMimeType(file);
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/jpeg" || type === "image/jpg") return ".jpg";
  const ext = getNameExt(file);
  if (ext) return ext;
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

export async function startThreadWithUser(
  otherUserId: string,
): Promise<{ ok: true; threadId: string } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  try {
    const threadId = await ensureOneToOneThread(session.user.id, otherUserId);
    return { ok: true, threadId };
  } catch {
    return { ok: false, error: "대화를 시작할 수 없습니다." };
  }
}

export async function sendThreadMessage(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const threadId = formData.get("threadId");
  const bodyRaw = (formData.get("body") ?? "") as string;
  const body = bodyRaw.trim();
  if (!threadId || typeof threadId !== "string") {
    return { ok: false, error: "잘못된 요청입니다." };
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  if (!body && files.length === 0) {
    return { ok: false, error: "메시지 또는 이미지를 입력해 주세요." };
  }
  for (const file of files) {
    const mime = getMimeType(file);
    const ext = getNameExt(file);
    const allowedByMime = mime ? ALLOWED_TYPES.includes(mime) : false;
    const allowedByExt = !mime && ext ? ALLOWED_EXTS.includes(ext) : false;
    if (!allowedByMime && !allowedByExt) {
      return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };
    }
    if (file.size > MAX_ORIGINAL_SIZE) {
      return { ok: false, error: "파일당 최대 60MB까지 업로드할 수 있습니다." };
    }
  }

  const uploadDir = path.join(process.cwd(), UPLOAD_BASE_DIR, threadId);
  await fs.mkdir(uploadDir, { recursive: true });

  const attachments: { type: "image"; url: string }[] = [];
  for (const file of files) {
    const originalExt = getExt(file);
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const { buffer: outputBuffer, ext } = await processImage(inputBuffer, originalExt);
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const publicPath = `/uploads/messages/${encodeURIComponent(threadId)}/${fileName}`;
    await fs.writeFile(filePath, outputBuffer);
    attachments.push({ type: "image", url: publicPath });
  }

  try {
    await insertMessage({
      threadId,
      senderUserId: session.user.id,
      body: body || null,
      attachments,
    });
    // 실시간 전파 (실패해도 메시지 저장은 성공 처리)
    try {
      await fetch(WS_PUBLISH_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ws-secret": WS_PUBLISH_SECRET,
        },
        body: JSON.stringify({ threadId }),
      });
    } catch {
      // ignore
    }
    revalidatePath("/messages");
    revalidatePath(`/messages/${encodeURIComponent(threadId)}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "전송 실패" };
  }
}

