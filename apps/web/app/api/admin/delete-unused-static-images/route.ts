import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { getPublicDirSync, resolvePublicFileSync } from "@/lib/watermark-config";
import { findUnusedStaticImages } from "@/lib/image/find-unused-static-images";
import { STATIC_IMAGE_WHITELIST } from "@/lib/image/static-image-config";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

function isPathUnderDir(absolutePath: string, dir: string): boolean {
  const normalized = path.normalize(absolutePath);
  const base = path.normalize(dir);
  return normalized === base || normalized.startsWith(base + path.sep);
}

function isAllowedPath(relWithSlash: string): boolean {
  const clean = relWithSlash.replace(/^\//, "");
  return STATIC_IMAGE_WHITELIST.some(
    (r) => r === clean || r === relWithSlash || `/${r}` === relWithSlash,
  );
}

async function ensureAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session)) {
    return null;
  }
  return session;
}

/** GET: 미사용 고정 이미지 경로 목록 */
export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const items = findUnusedStaticImages();
  return NextResponse.json({ items });
}

/** POST: 단일 경로 삭제. body: { path: string } */
export async function POST(req: Request) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "path가 필요합니다." },
      { status: 400 },
    );
  }

  const raw =
    typeof body.path === "string" ? body.path.trim() : "";
  const relWithSlash = raw ? (raw.startsWith("/") ? raw : `/${raw}`) : null;
  if (!relWithSlash || relWithSlash === "/") {
    return NextResponse.json(
      { error: "path가 필요합니다." },
      { status: 400 },
    );
  }

  if (!isAllowedPath(relWithSlash)) {
    return NextResponse.json(
      { error: "허용된 고정 이미지 경로가 아닙니다." },
      { status: 400 },
    );
  }

  const publicDir = getPublicDirSync();
  const absolutePath = resolvePublicFileSync(relWithSlash);
  if (!isPathUnderDir(absolutePath, publicDir)) {
    return NextResponse.json(
      { error: "경로가 public 이외입니다." },
      { status: 400 },
    );
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json(
      { error: "파일이 존재하지 않습니다." },
      { status: 404 },
    );
  }

  const unused = findUnusedStaticImages();
  if (!unused.includes(relWithSlash)) {
    return NextResponse.json(
      { error: "소스에서 참조 중인 이미지는 삭제할 수 없습니다." },
      { status: 400 },
    );
  }

  try {
    await fsPromises.unlink(absolutePath);
    return NextResponse.json({ deleted: relWithSlash });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `삭제 실패: ${msg}` },
      { status: 500 },
    );
  }
}
