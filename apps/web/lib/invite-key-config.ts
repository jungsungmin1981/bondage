/**
 * 인증키 생성 가능까지 필요한 가입 경과 시간(시간 단위).
 * 환경변수 INVITE_KEY_MIN_AGE_HOURS 사용, 없으면 0.5(30분).
 * API·서버 페이지에서만 사용.
 */
export function getInviteKeyMinAgeHours(): number {
  const raw = process.env.INVITE_KEY_MIN_AGE_HOURS;
  if (raw == null || raw === "") return 0.5;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0.5;
}
