"use client";

import { useEffect, useRef, useState } from "react";
import {
  getPhase,
  getRemainingMs,
  type MonthlyHotpickPhase,
} from "@/lib/monthly-hotpick-period";

function getTimeParts(ms: number): { d: number; h: number; m: number; s: number } {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { d, h, m, s };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const cyanBoxStyle = { boxShadow: "0 0 12px rgba(34, 211, 238, 0.25)" };
const cyanTextStyle = { textShadow: "0 0 8px rgba(34, 211, 238, 0.6)" };
const amberBoxStyle = { boxShadow: "0 0 12px rgba(251, 191, 36, 0.25)" };
const amberTextStyle = { textShadow: "0 0 8px rgba(251, 191, 36, 0.6)" };

/** 0~9 뒤에 0을 한 번 더 붙여 9→0일 때 아래에서 0이 올라오도록 함 */
const DIGITS_STRIP = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const ROW_COUNT = DIGITS_STRIP.length;
const ROW_HEIGHT_PCT = 100 / ROW_COUNT;

function OdometerDigitSingle({
  value,
  id,
  isVoting,
}: {
  value: string;
  id: string;
  isVoting: boolean;
}) {
  const prevValueRef = useRef(value);
  const num = Math.min(9, Math.max(0, parseInt(value, 10) || 0));

  const [position, setPosition] = useState(() =>
    num === 0 ? 0 : num,
  );

  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;

    const nextPosition =
      num === 0 && prev === "9"
        ? 10
        : num === 0
          ? 0
          : num;
    setPosition(nextPosition);
  }, [value, num]);

  const translateY = -position * ROW_HEIGHT_PCT;

  return (
    <div
      className={`h-12 w-8 overflow-hidden rounded border sm:h-14 sm:w-10 ${isVoting ? "border-amber-500/40 bg-slate-900/90" : "border-cyan-500/40 bg-slate-900/90"}`}
      style={isVoting ? amberBoxStyle : cyanBoxStyle}
      aria-hidden
    >
      <div
        className="flex w-full flex-col transition-transform duration-[750ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:duration-0"
        style={{
          height: `${ROW_COUNT * 100}%`,
          transform: `translateY(${translateY}%)`,
        }}
      >
        {DIGITS_STRIP.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="flex min-h-0 flex-shrink-0 items-center justify-center"
            style={{ height: `${ROW_HEIGHT_PCT}%` }}
          >
            <span
              className={`font-mono text-lg tabular-nums font-semibold leading-none sm:text-xl ${isVoting ? "text-amber-400" : "text-cyan-400"}`}
              style={isVoting ? amberTextStyle : cyanTextStyle}
            >
              {d}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OdometerDigitPair({
  value,
  label,
  idPrefix,
  isVoting,
}: {
  value: string;
  label: string;
  idPrefix: string;
  isVoting: boolean;
}) {
  const chars = value.padStart(2, "0").slice(-2).split("");
  return (
    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
      <div className="flex gap-0.5 sm:gap-1">
        {chars.map((c, i) => (
          <OdometerDigitSingle
            key={`${idPrefix}-${i}`}
            id={`${idPrefix}-${i}`}
            value={c}
            isVoting={isVoting}
          />
        ))}
      </div>
      <span
        className={`text-[10px] font-medium uppercase tracking-wider sm:text-xs ${isVoting ? "text-amber-400/80" : "text-cyan-400/80"}`}
      >
        {label}
      </span>
    </div>
  );
}

export function MonthlyHotpickCountdown({
  phase: initialPhase,
  monthKey,
  className,
  /** 관리자 미리보기: 이 시각까지 남은 시간으로 표시(투표마감 스타일) */
  overrideEndDate,
}: {
  phase: MonthlyHotpickPhase;
  monthKey: string;
  className?: string;
  overrideEndDate?: Date;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);
  useEffect(() => {
    if (initialPhase === "ended" && !overrideEndDate) return;
    if (now == null) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [initialPhase, overrideEndDate, now]);

  if (initialPhase === "ended" && !overrideEndDate) {
    return (
      <p className={className ?? ""}>
        이번 달 투표가 종료되었습니다.
      </p>
    );
  }

  const phase = now == null ? initialPhase : overrideEndDate ? "voting" : getPhase(monthKey, now);
  const remainingMs =
    now == null
      ? 0
      : overrideEndDate
        ? Math.max(0, overrideEndDate.getTime() - now.getTime())
        : getRemainingMs(phase, monthKey, now);
  const { d, h, m, s } = getTimeParts(remainingMs);
  const label =
    phase === "registration"
      ? "등록마감"
      : "투표마감";
  const isRegistration = phase === "registration";

  const isVoting = !isRegistration;

  return (
    <div className={`flex flex-col items-center ${className ?? ""}`}>
      <p
        className={
          isRegistration
            ? "mb-3 text-sm font-semibold text-cyan-400/95 sm:mb-4 sm:text-base"
            : "mb-3 text-sm font-medium text-amber-400/80 sm:mb-4 sm:text-base"
        }
        style={
          isRegistration
            ? { textShadow: "0 0 10px rgba(34, 211, 238, 0.5)" }
            : { textShadow: "0 0 10px rgba(251, 191, 36, 0.5)" }
        }
      >
        {label}
      </p>
      <div className="flex flex-wrap items-end justify-center gap-1.5 sm:gap-3">
        <OdometerDigitPair idPrefix="d" value={String(d)} label="일" isVoting={isVoting} />
        <span
          className={`mb-1.5 font-mono text-lg font-bold sm:mb-2 sm:text-xl ${isVoting ? "text-amber-400/70" : "text-cyan-400/70"}`}
          aria-hidden
        >
          :
        </span>
        <OdometerDigitPair idPrefix="h" value={pad2(h)} label="시간" isVoting={isVoting} />
        <span
          className={`mb-1.5 font-mono text-lg font-bold sm:mb-2 sm:text-xl ${isVoting ? "text-amber-400/70" : "text-cyan-400/70"}`}
          aria-hidden
        >
          :
        </span>
        <OdometerDigitPair idPrefix="m" value={pad2(m)} label="분" isVoting={isVoting} />
        <span
          className={`mb-1.5 font-mono text-lg font-bold sm:mb-2 sm:text-xl ${isVoting ? "text-amber-400/70" : "text-cyan-400/70"}`}
          aria-hidden
        >
          :
        </span>
        <OdometerDigitPair idPrefix="s" value={pad2(s)} label="초" isVoting={isVoting} />
      </div>
    </div>
  );
}
