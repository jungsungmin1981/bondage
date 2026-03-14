import sharp from "sharp";

export async function resizeToJpeg(
  buffer: Buffer,
  maxWidth = 1600,
  quality = 80,
): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();
}

export async function resizeCardToPng(
  buffer: Buffer,
  maxWidth = 1600,
): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png()
    .toBuffer();
}

/** 카드 비율(3:4)에 맞게 크롭 후 리사이즈. fit: cover 방식. */
export async function resizeToCardAspectPng(
  buffer: Buffer,
  width = 800,
): Promise<Buffer> {
  const height = Math.round((width * 4) / 3);
  return sharp(buffer)
    .rotate()
    .resize({ width, height, fit: "cover", position: "center" })
    .png()
    .toBuffer();
}

