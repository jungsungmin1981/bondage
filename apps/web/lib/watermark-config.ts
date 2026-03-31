export type WatermarkConfig = {
  type: "text" | "image";
  text: string;
  positionX: number;
  positionY: number;
  /** 0 = 완전 투명, 1 = 완전 불투명. SVG fill-opacity / 이미지 alpha 값으로 직접 사용 */
  opacity: number;
  scale?: number;
  rotation?: number;
  /** 이미지 타입일 때 S3 URL 또는 /로 시작하는 public 경로 */
  imagePath?: string;
};

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  type: "text",
  text: "",
  positionX: 0.8,
  positionY: 0.9,
  opacity: 0.6,
  scale: 1,
  rotation: 0,
};

const SITE_CONFIG_KEY = "watermark_config";

/** 서버에서만 호출. DB에서 설정 읽기 */
export async function getWatermarkConfig(): Promise<WatermarkConfig> {
  try {
    const { getSiteConfigValue } = await import("@workspace/db");
    const raw = await getSiteConfigValue(SITE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WatermarkConfig>;
      return {
        ...DEFAULT_WATERMARK_CONFIG,
        ...parsed,
      };
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[watermark] DB에서 설정 읽기 실패:", e instanceof Error ? e.message : e);
    }
  }
  return { ...DEFAULT_WATERMARK_CONFIG };
}
/** 서버에서만 호출. DB에 설정 저장 */
export async function saveWatermarkConfigToDB(config: WatermarkConfig): Promise<void> {
  const { setSiteConfigValue } = await import("@workspace/db");
  await setSiteConfigValue(SITE_CONFIG_KEY, JSON.stringify(config));
}

// ---------------------------------------------------------------------------
// 하위 호환: public 디렉터리 경로 관련 유틸 (이미지 워터마크 로컬 fallback용)
// ---------------------------------------------------------------------------

export function getPublicDirSync(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
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

export function resolvePublicFileSync(rel: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  const clean = rel.replace(/^\//, "");
  return path.join(getPublicDirSync(), clean);
}
