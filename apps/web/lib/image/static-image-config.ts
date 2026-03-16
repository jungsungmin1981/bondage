/**
 * 고정 이미지 리사이즈용: 화이트리스트 + 경로별 표시 폭(px).
 * 목표 폭 = min(표시폭 × 2, 1600). 맵에 없으면 1600 적용.
 */
export const STATIC_IMAGE_MAX_WIDTH = 1600;

/** 소스 고정 이미지 경로만 (uploads, marks/custom-*, marks/bunny-* 제외) */
export const STATIC_IMAGE_WHITELIST: string[] = [
  "main-bg.png",
  "main-background.png",
  "watermark.png",
  "default-bunny-card.png",
  "default-rigger-mark.png",
  "rigger-card-gold.png",
  "rigger-card-silver.png",
  "rigger-card-bronze.png",
  "rigger-card-legend.png",
  "jail-card.png",
  "donation-card.png",
  "donation-card.gif",
  "approve-reject-icon.png",
  "approve-request-icon.png",
  "lock-private.png",
  "class-beginner-placeholder.png",
  "star-gold.png",
  "watermark-preview-sample.jpg",
  "icons/challenge-arrow.png",
  "marks/dragon-mark.png",
  "marks/mark-ring.png",
  "marks/mark-collar.png",
  "marks/mark-gag.png",
  "marks/mark-cuffs.png",
  "marks/mark-whip.png",
];

/** 경로(public 기준 상대, 슬래시 없음) → UI 표시 최대 폭(px). 없으면 800으로 간주 후 ×2 = 1600. */
export const STATIC_IMAGE_DISPLAY_WIDTH: Record<string, number> = {
  "main-bg.png": 800,
  "main-background.png": 800,
  "watermark.png": 800,
  "rigger-card-gold.png": 800,
  "rigger-card-silver.png": 800,
  "rigger-card-bronze.png": 800,
  "rigger-card-legend.png": 800,
  "jail-card.png": 800,
  "donation-card.png": 800,
  "donation-card.gif": 800,
  "approve-reject-icon.png": 160,
  "approve-request-icon.png": 416,
  "lock-private.png": 192,
  "default-bunny-card.png": 400,
  "default-rigger-mark.png": 400,
  "marks/dragon-mark.png": 400,
  "marks/mark-ring.png": 400,
  "marks/mark-collar.png": 400,
  "marks/mark-gag.png": 400,
  "marks/mark-cuffs.png": 400,
  "marks/mark-whip.png": 400,
  "icons/challenge-arrow.png": 128,
  "class-beginner-placeholder.png": 400,
  "star-gold.png": 400,
  "watermark-preview-sample.jpg": 800,
};

export function getTargetWidthForPath(relPath: string): number {
  const clean = relPath.replace(/^\//, "");
  const displayWidth = STATIC_IMAGE_DISPLAY_WIDTH[clean] ?? 800;
  return Math.min(displayWidth * 2, STATIC_IMAGE_MAX_WIDTH);
}
