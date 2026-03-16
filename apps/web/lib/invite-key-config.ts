/**
 * 인증키 생성 가능까지 필요한 가입 경과 시간(시간 단위).
 * 환경변수 INVITE_KEY_MIN_AGE_HOURS 사용, 없으면 120(5일).
 * API·서버 페이지에서만 사용.
 */
export function getInviteKeyMinAgeHours(): number {
  const raw = process.env.INVITE_KEY_MIN_AGE_HOURS;
  if (raw == null || raw === "") return 120;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 120;
}
