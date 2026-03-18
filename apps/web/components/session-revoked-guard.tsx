"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const POLL_INTERVAL_MS = 60 * 1000;

/** 로그인 상태에서 주기적으로 세션을 조회해, 다른 기기에서 로그인되어 무효화된 경우 로그인 페이지로 보냄 */
export function SessionRevokedGuard() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkSession = useCallback(async () => {
    const { data: current } = await authClient.getSession({
      query: { disableCookieCache: true },
    });
    if (!current?.user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      await authClient.signOut();
      router.replace(
        `/login?reason=${encodeURIComponent("다른 기기에서 로그인되어 로그아웃되었습니다.")}`,
      );
    }
  }, [router]);

  useEffect(() => {
    if (!session?.user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 마운트 즉시 체크 없이 폴링 주기 후부터 체크 (Cold Start 방지)
    intervalRef.current = setInterval(checkSession, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session?.user?.id, router, checkSession]);

  return null;
}
