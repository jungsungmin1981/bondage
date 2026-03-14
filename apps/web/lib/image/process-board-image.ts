import sharp from "sharp";

const SERVER_RESIZE = { maxWidthOrHeight: 1280, jpegQuality: 82 };

/**
 * 이미지 버퍼를 리사이즈하여 JPEG 버퍼로 반환.
 * 보드 본문 삽입용 이미지 처리에 사용.
 */
export async function processBoardImage(
  input: Buffer,
  _originalExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  try {
    const size = SERVER_RESIZE.maxWidthOrHeight;
    const out = await sharp(input)
      .rotate()
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: SERVER_RESIZE.jpegQuality })
      .toBuffer();
    return { buffer: out, ext: ".jpg" };
  } catch {
    return { buffer: input, ext: ".jpg" };
  }
}
