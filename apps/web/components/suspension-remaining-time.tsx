"use client";

import { useEffect, useState } from "react";

/** 정지 해지까지 남은 시간을 일·시·분으로 포맷 (인증키 만료 스타일) */
function formatSuspensionRemaining(seconds: number): string {
  if (seconds <= 0) return "해제됨";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}일`);
  if (h > 0) parts.push(`${h}시간`);
  if (m > 0) parts.push(`${m}분`);
  if (parts.length === 0) parts.push("1분 미만");
  return parts.join(" ");
}

const SUSPENSION_TIME_STYLE =
  "text-center font-mono text-base font-semibold tracking-widest tabular-nums text-red-600 [text-shadow:0_0_6px_currentColor] dark:text-red-400 sm:text-lg";

export function SuspensionRemainingTime({
  suspendedUntil,
  className,
}: {
  /** 해제 예정 시각 ISO 문자열. null이면 영구 정지 */
  suspendedUntil: string | null;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (suspendedUntil == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [suspendedUntil]);

  if (suspendedUntil == null) {
    return (
      <span className={SUSPENSION_TIME_STYLE + (className ? ` ${className}` : "")}>
        영구 정지
      </span>
    );
  }

  const untilMs = new Date(suspendedUntil).getTime();
  const remainingSeconds = Math.max(0, Math.floor((untilMs - now) / 1000));
  const text =
    remainingSeconds > 0
      ? formatSuspensionRemaining(remainingSeconds)
      : "해제됨";

  return (
    <span className={SUSPENSION_TIME_STYLE + (className ? ` ${className}` : "")}>
      {text}
    </span>
  );
}
