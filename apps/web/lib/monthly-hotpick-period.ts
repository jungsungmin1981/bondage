/**
 * 월간 핫픽 일정: 접수(월 1일 ~ 말-5일 23:59), 투표(말-5일 00:00 ~ 말일 23:59).
 */

export type MonthlyHotpickPhase = "registration" | "voting" | "ended";

/** 현재(또는 지정) 시각 기준 이번 달 키 "YYYY-MM-01" */
export function getMonthKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** 해당 월의 마지막 날 (1-based day) */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 해당 월의 접수 마감 시각 (말일 - 5일 23:59:59.999) */
export function getRegistrationEnd(monthKey: string): Date {
  const [y = 0, m = 1] = monthKey.split("-").map(Number);
  const lastDay = getLastDayOfMonth(y, m);
  const regEndDay = Math.max(1, lastDay - 5);
  return new Date(y, m - 1, regEndDay, 23, 59, 59, 999);
}

/** 해당 월의 투표 마감 시각 (말일 23:59:59.999) */
export function getVotingEnd(monthKey: string): Date {
  const [y = 0, m = 1] = monthKey.split("-").map(Number);
  const lastDay = getLastDayOfMonth(y, m);
  return new Date(y, m - 1, lastDay, 23, 59, 59, 999);
}

/** 현재 단계: registration | voting | ended */
export function getPhase(
  monthKey: string,
  now: Date = new Date(),
): MonthlyHotpickPhase {
  const regEnd = getRegistrationEnd(monthKey);
  const voteEnd = getVotingEnd(monthKey);
  if (now <= regEnd) return "registration";
  if (now <= voteEnd) return "voting";
  return "ended";
}

/** 접수 또는 투표 남은 밀리초. phase가 ended면 0. */
export function getRemainingMs(
  phase: MonthlyHotpickPhase,
  monthKey: string,
  now: Date = new Date(),
): number {
  if (phase === "ended") return 0;
  const end = phase === "registration" ? getRegistrationEnd(monthKey) : getVotingEnd(monthKey);
  return Math.max(0, end.getTime() - now.getTime());
}
