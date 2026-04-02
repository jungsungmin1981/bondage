"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const INACTIVITY_MS = 60 * 60 * 1000; // 1시간
const THROTTLE_MS = 60 * 1000; // 활동 감지 최소 간격 1분

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
] as const;

/**
 * 운영진·관리자 전용 비활동 자동 OTP 재인증 가드.
 * 마지막 활동 이후 1시간이 지나면 OTP 쿠키를 삭제하고 OTP 게이트로 리디렉션한다.
 */
export function OperatorInactivityGuard({ isOperator }: { isOperator: boolean }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const scheduleLogout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/otp/clear", { method: "POST" });
      } catch {
        // 네트워크 오류여도 리디렉션 진행
      }
      router.replace("/operator/otp-gate");
    }, INACTIVITY_MS);
  }, [router]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;
    scheduleLogout();
  }, [scheduleLogout]);

  useEffect(() => {
    if (!isOperator) return;

    scheduleLogout();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [isOperator, scheduleLogout, handleActivity]);

  return null;
}
