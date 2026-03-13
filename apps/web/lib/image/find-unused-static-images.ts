import path from "path";
import fs from "fs";
import { getPublicDirSync, resolvePublicFileSync } from "@/lib/watermark-config";
import { STATIC_IMAGE_WHITELIST } from "./static-image-config";

const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".css", ".json"];
const IGNORE_DIRS = ["node_modules", ".next", "dist", ".git"];

function isPathUnderDir(absolutePath: string, dir: string): boolean {
  const normalized = path.normalize(absolutePath);
  const base = path.normalize(dir);
  return normalized === base || normalized.startsWith(base + path.sep);
}

function collectSourceFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.includes(e.name)) continue;
      try {
        const stat = fs.statSync(full);
        if (stat.isSymbolicLink()) continue;
      } catch {
        continue;
      }
      collectSourceFiles(full, out);
    } else if (SOURCE_EXTS.includes(path.extname(e.name).toLowerCase())) {
      out.push(full);
    }
  }
}

/**
 * sourceRoot 아래 소스 파일을 한 번만 순회하고, 각 파일 내용을 읽어
 * 화이트리스트 경로별로 참조 여부를 반환. (순회 1회로 제한)
 */
function getReferencedPaths(sourceRoot: string): Set<string> {
  const files: string[] = [];
  collectSourceFiles(sourceRoot, files);
  const referenced = new Set<string>();
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      for (const rel of STATIC_IMAGE_WHITELIST) {
        const relWithSlash = rel.startsWith("/") ? rel : `/${rel}`;
        if (content.includes(relWithSlash) || content.includes(rel)) {
          referenced.add(relWithSlash);
        }
      }
    } catch {
      // skip unreadable
    }
  }
  return referenced;
}

/**
 * 화이트리스트 중 실제 파일이 있지만 소스에서 참조되지 않는 경로 목록 반환.
 */
export function findUnusedStaticImages(): string[] {
  const publicDir = getPublicDirSync();
  const sourceRoot = path.dirname(publicDir);
  const referenced = getReferencedPaths(sourceRoot);
  const unused: string[] = [];

  for (const rel of STATIC_IMAGE_WHITELIST) {
    const relWithSlash = rel.startsWith("/") ? rel : `/${rel}`;
    const absolutePath = resolvePublicFileSync(relWithSlash);

    if (!isPathUnderDir(absolutePath, publicDir)) continue;
    if (!fs.existsSync(absolutePath)) continue;
    if (referenced.has(relWithSlash)) continue;

    unused.push(relWithSlash);
  }

  return unused;
}
