/** 정보수정 편집 모드 여부 — 마크 변경은 이게 true일 때만 허용 */
export const PROFILE_EDITING_EVENT = "bondage:profile-editing";

export function dispatchProfileEditing(editing: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PROFILE_EDITING_EVENT, { detail: { editing } }),
  );
}
