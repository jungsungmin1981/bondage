"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const TARGET = "/admin/invite-keys";

/** 서버 리다이렉트 대신 클라이언트에서 한 번만 이동해 무한루프 방지 */
export function AdminOnlyRedirect() {
  const router = useRouter();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (didRedirect.current) return;
    didRedirect.current = true;
    router.replace(TARGET);
  }, [router]);

  return null;
}
