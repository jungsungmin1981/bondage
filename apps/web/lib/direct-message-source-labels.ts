/** DB 출처 값과 동기화 — 클라이언트에서 @workspace/db를 쓰면 fs/postgres 번들 오류가 나므로 문자열만 사용 */
const LABELS: Record<string, string> = {
  rigger_rejection: "리거 승인 반려",
  class_challenge_rejection: "클래스 도전 반려",
  bunny_rejection: "게시물 승인 거절",
  suspension_notice: "계정 사용 제한",
  // admin_notice: "공지",
};

/** 쪽지 출처(source) 값을 한글 라벨로 변환 */
export function getDirectMessageSourceLabel(source: string | null | undefined): string {
  if (!source) return "쪽지";
  return LABELS[source] ?? "쪽지";
}
