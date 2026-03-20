const MAIN_BACKGROUND_S3_KEY = "uploads/main-background.png";

/**
 * 메인 백그라운드 이미지 URL 반환.
 * S3_PUBLIC_BASE_URL 환경변수 기준으로 고정 키의 URL을 반환.
 * S3 미설정 시 null 반환.
 */
export async function getMainBackgroundUrl(): Promise<string | null> {
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/${MAIN_BACKGROUND_S3_KEY}`;
}
