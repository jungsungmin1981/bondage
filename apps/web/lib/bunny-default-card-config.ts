const BUNNY_DEFAULT_CARD_S3_KEY = "uploads/default-bunny-card.png";

/**
 * 버니 기본 카드 이미지 URL 반환.
 * S3_PUBLIC_BASE_URL 환경변수 기준으로 고정 키의 URL을 반환.
 * S3 미설정 시 public의 정적 파일 경로 반환.
 */
export function getBunnyDefaultCardUrl(): string {
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) return "/default-bunny-card.png";
  return `${base}/${BUNNY_DEFAULT_CARD_S3_KEY}`;
}

/** DB에 저장된 URL이 기본 카드인지 여부 */
function isDefaultBunnyCardUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  return (
    u === "/default-bunny-card.png" || u.endsWith("/uploads/default-bunny-card.png")
  );
}

/**
 * 버니 카드 표시용 URL 반환.
 * 기본 카드 URL이면 현재 설정된 기본 카드를 동적으로 반환 (업로드 변경 시 자동 반영).
 */
export function resolveBunnyCardUrl(storedUrl: string | null | undefined): string | null {
  if (!storedUrl?.trim()) return null;
  const u = storedUrl.trim();
  if (isDefaultBunnyCardUrl(u)) return getBunnyDefaultCardUrl();
  return u;
}

export { BUNNY_DEFAULT_CARD_S3_KEY };
