import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import sharp from "sharp";
import { getPublicDirSync, resolvePublicFileSync } from "@/lib/watermark-config";
import { resizeToJpeg, resizeCardToPng } from "@/lib/image/resize";
import {
  STATIC_IMAGE_WHITELIST,
  STATIC_IMAGE_DISPLAY_WIDTH,
  getTargetWidthForPath,
} from "@/lib/image/static-image-config";
import { findUnusedStaticImages } from "@/lib/image/find-unused-static-images";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const JPEG_QUALITY = 80;

function isPathUnderDir(absolutePath: string, dir: string): boolean {
  const normalized = path.normalize(absolutePath);
  const base = path.normalize(dir);
  return normalized === base || normalized.startsWith(base + path.sep);
}

async function ensureAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session)) {
    return null;
  }
  return session;
}

/** GET: 고정 이미지 조회 — 존재 여부, 현재 폭, 목표 폭, 리사이즈 필요 여부 */
export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const publicDir = getPublicDirSync();
  const unusedSet = new Set(findUnusedStaticImages());
  const items: {
    path: string;
    exists: boolean;
    displayWidth: number;
    currentWidth?: number;
    targetWidth: number;
    needsResize: boolean;
    isUnused: boolean;
    error?: string;
  }[] = [];

  for (const rel of STATIC_IMAGE_WHITELIST) {
    const relWithSlash = rel.startsWith("/") ? rel : `/${rel}`;
    const clean = rel.replace(/^\//, "");
    const absolutePath = resolvePublicFileSync(relWithSlash);
    const targetWidth = getTargetWidthForPath(relWithSlash);
    const displayWidth = STATIC_IMAGE_DISPLAY_WIDTH[clean] ?? 800;

    if (!isPathUnderDir(absolutePath, publicDir)) {
      items.push({
        path: relWithSlash,
        exists: false,
        displayWidth,
        targetWidth,
        needsResize: false,
        isUnused: false,
        error: "경로가 public 이외입니다.",
      });
      continue;
    }

    if (!fs.existsSync(absolutePath)) {
      items.push({
        path: relWithSlash,
        exists: false,
        displayWidth,
        targetWidth,
        needsResize: false,
        isUnused: false,
      });
      continue;
    }

    const isUnused = unusedSet.has(relWithSlash);
    try {
      const buffer = await fsPromises.readFile(absolutePath);
      const meta = await sharp(buffer).metadata();
      const currentWidth = meta.width ?? 0;
      const needsResize = currentWidth > targetWidth;
      items.push({
        path: relWithSlash,
        exists: true,
        displayWidth,
        currentWidth,
        targetWidth,
        needsResize,
        isUnused,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      items.push({
        path: relWithSlash,
        exists: true,
        displayWidth,
        targetWidth,
        needsResize: false,
        isUnused,
        error: msg,
      });
    }
  }

  return NextResponse.json({ items });
}

/** POST: 목표 폭 초과 파일만 리사이즈 후 저장 */
export async function POST() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const publicDir = getPublicDirSync();
  const resized: { path: string; originalWidth: number; newWidth: number }[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const rel of STATIC_IMAGE_WHITELIST) {
    const relWithSlash = rel.startsWith("/") ? rel : `/${rel}`;
    const absolutePath = resolvePublicFileSync(relWithSlash);
    const targetWidth = getTargetWidthForPath(relWithSlash);

    if (!isPathUnderDir(absolutePath, publicDir)) {
      errors.push(`${rel}: 경로가 public 이외입니다.`);
      continue;
    }

    if (!fs.existsSync(absolutePath)) {
      skipped += 1;
      continue;
    }

    try {
      const buffer = await fsPromises.readFile(absolutePath);
      const meta = await sharp(buffer).metadata();
      const width = meta.width ?? 0;

      if (width <= targetWidth) {
        skipped += 1;
        continue;
      }

      const ext = path.extname(absolutePath).toLowerCase();
      const resizedBuffer =
        ext === ".png"
          ? await resizeCardToPng(buffer, targetWidth)
          : await resizeToJpeg(buffer, targetWidth, JPEG_QUALITY);

      const newMeta = await sharp(resizedBuffer).metadata();
      const newWidth = newMeta.width ?? targetWidth;

      await fsPromises.writeFile(absolutePath, resizedBuffer);
      resized.push({ path: relWithSlash, originalWidth: width, newWidth });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${rel}: ${msg}`);
    }
  }

  return NextResponse.json({
    resized,
    skipped,
    ...(errors.length > 0 && { errors }),
  });
}
