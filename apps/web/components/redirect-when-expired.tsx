"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 마감 시각이 지나면 redirectTo로 이동.
 * 관리자(disabled=true)일 때는 리다이렉트하지 않음.
 */
export function RedirectWhenExpired({
  endTimeIso,
  redirectTo,
  disabled,
}: {
  /** 마감 시각 (ISO 문자열) */
  endTimeIso: string;
  redirectTo: string;
  disabled?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (disabled) return;

    const endMs = new Date(endTimeIso).getTime();

    const check = () => {
      if (Date.now() >= endMs) {
        router.replace(redirectTo);
      }
    };

    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [endTimeIso, redirectTo, disabled, router]);

  return null;
}
