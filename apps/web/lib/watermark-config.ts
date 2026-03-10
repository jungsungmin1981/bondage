import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

export type WatermarkConfig = {
  type: "text" | "image";
  text: string;
  positionX: number;
  positionY: number;
  opacity: number;
  scale?: number;
  rotation?: number;
  imagePath?: string;
};

const DEFAULT_CONFIG: WatermarkConfig = {
  type: "text",
  text: "",
  positionX: 0.8,
  positionY: 0.9,
  opacity: 0.6,
  scale: 1,
  rotation: 0,
};

/**
 * turbo/pnpm dev를 레포 루트에서 돌리면 cwd가 bondage라
 * process.cwd()/public 이 아니라 apps/web/public 을 써야 함.
 * 설정/워터마크 이미지가 있는 디렉터리를 동기로 해석.
 */
export function getPublicDirSync(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public"),
    path.join(cwd, "apps", "web", "public"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "watermark-config.json"))) return dir;
    if (fs.existsSync(path.join(dir, "watermark.png"))) return dir;
  }
  const nested = path.join(cwd, "apps", "web", "public");
  if (fs.existsSync(nested)) return nested;
  return path.join(cwd, "public");
}

/** public 기준 상대 경로(leading slash 허용) → 절대 파일 경로 */
export function resolvePublicFileSync(rel: string): string {
  const clean = rel.replace(/^\//, "");
  return path.join(getPublicDirSync(), clean);
}

/** 서버에서만 호출. 설정 파일 읽기 */
export async function getWatermarkConfig(): Promise<WatermarkConfig> {
  const filePath = path.join(getPublicDirSync(), "watermark-config.json");
  try {
    const data = await fsPromises.readFile(filePath, "utf-8");
    const parsed = JSON.parse(data) as Partial<WatermarkConfig>;
    return {
      type: parsed.type ?? DEFAULT_CONFIG.type,
      text: parsed.text ?? DEFAULT_CONFIG.text,
      positionX:
        typeof parsed.positionX === "number"
          ? parsed.positionX
          : DEFAULT_CONFIG.positionX,
      positionY:
        typeof parsed.positionY === "number"
          ? parsed.positionY
          : DEFAULT_CONFIG.positionY,
      opacity:
        typeof parsed.opacity === "number"
          ? parsed.opacity
          : DEFAULT_CONFIG.opacity,
      scale:
        typeof parsed.scale === "number"
          ? parsed.scale
          : DEFAULT_CONFIG.scale ?? 1,
      rotation:
        typeof parsed.rotation === "number"
          ? parsed.rotation
          : DEFAULT_CONFIG.rotation ?? 0,
      imagePath: parsed.imagePath ?? "/watermark.png",
    };
  } catch (e) {
    // 설정 파일 없을 때: 워터마크.png만 있으면 이미지 타입으로 시도
    const pngPath = path.join(getPublicDirSync(), "watermark.png");
    if (fs.existsSync(pngPath)) {
      return {
        ...DEFAULT_CONFIG,
        type: "image",
        imagePath: "/watermark.png",
      };
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[watermark] watermark-config.json 을 읽지 못했습니다:",
        filePath,
        e instanceof Error ? e.message : e,
      );
    }
    return { ...DEFAULT_CONFIG };
  }
}
