import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { getPublicDirSync, resolvePublicFileSync } from "@/lib/watermark-config";

const MAIN_BACKGROUND_FILENAME = "main-background.png";

export async function getMainBackgroundUrl(): Promise<string | null> {
  const filePath = resolvePublicFileSync(`/${MAIN_BACKGROUND_FILENAME}`);
  try {
    await fsPromises.access(filePath);
    return `/${MAIN_BACKGROUND_FILENAME}`;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      const publicDir = getPublicDirSync();
      console.warn(
        "[main-background] main-background 이미지가 없습니다:",
        path.join(publicDir, MAIN_BACKGROUND_FILENAME),
      );
    }
    return null;
  }
}

