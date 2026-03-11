/** 활동지역 입력 최대 글자수 (칸 벗어남 방지) */
export const ACTIVITY_REGION_MAX_LENGTH = 50;

/** 상세 프로필 — 성별 옵션 (리거/버니 공통) */
export const GENDER_OPTIONS = ["남", "여"] as const;

/** 프로필 편집 — 구분 / Yes·No / 스타일 체크 목록 (추후 스타일만 배열 추가하면 됨) */
export const DIVISION_OPTIONS = ["리거", "리거 & 버니"] as const;
export const YES_NO_OPTIONS = ["Yes", "No"] as const;
export const STYLE_OPTIONS = ["아트", "긴박", "섹슈얼"] as const;

export type DivisionValue = (typeof DIVISION_OPTIONS)[number];
export type YesNoValue = (typeof YES_NO_OPTIONS)[number];

/** 스타일 복수 선택 → 문자열로 저장 (쉼표 구분) */
export function styleArrayToString(styles: string[]): string {
  return [...new Set(styles)].join(",");
}

export function styleStringToArray(s: string | null | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
