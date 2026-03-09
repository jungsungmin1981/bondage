import fs from "fs/promises";
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

/** 서버에서만 호출. 설정 파일 읽기 */
export async function getWatermarkConfig(): Promise<WatermarkConfig> {
  const filePath = path.join(process.cwd(), "public", "watermark-config.json");
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(data) as Partial<WatermarkConfig>;
    return {
      type: parsed.type ?? DEFAULT_CONFIG.type,
      text: parsed.text ?? DEFAULT_CONFIG.text,
      positionX: typeof parsed.positionX === "number" ? parsed.positionX : DEFAULT_CONFIG.positionX,
      positionY: typeof parsed.positionY === "number" ? parsed.positionY : DEFAULT_CONFIG.positionY,
      opacity: typeof parsed.opacity === "number" ? parsed.opacity : DEFAULT_CONFIG.opacity,
      scale: typeof parsed.scale === "number" ? parsed.scale : DEFAULT_CONFIG.scale ?? 1,
      rotation: typeof parsed.rotation === "number" ? parsed.rotation : DEFAULT_CONFIG.rotation ?? 0,
      imagePath: parsed.imagePath ?? "/watermark.png",
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
