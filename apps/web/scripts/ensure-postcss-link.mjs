/**
 * Vercel/pnpm: apps/web/node_modules/@tailwindcss/postcss가 없으면 루트에서 심링크 생성.
 * Next loadPlugin이 이 경로에서 resolve하므로 필수.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(webDir, "..", "..");
const linkPath = path.join(webDir, "node_modules", "@tailwindcss", "postcss");
const targetPath = path.join(rootDir, "node_modules", "@tailwindcss", "postcss");

try {
  if (!fs.existsSync(linkPath) && fs.existsSync(targetPath)) {
    const scopeDir = path.dirname(linkPath);
    fs.mkdirSync(scopeDir, { recursive: true });
    fs.symlinkSync(targetPath, linkPath, "dir");
  }
} catch {
  // Windows 등에서 심링크 실패 시 무시 (로컬은 pnpm이 이미 링크함)
}
