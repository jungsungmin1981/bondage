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

