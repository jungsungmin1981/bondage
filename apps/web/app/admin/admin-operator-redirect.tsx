"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getFirstAllowedPath, isOperatorAllowedPath } from "@/lib/admin-operator-permissions";

export function AdminOperatorRedirect({
  operatorOnly,
  allowedTabIds,
  allowedTabIdsKey,
}: {
  operatorOnly: boolean;
  /** 허용된 탭/하위 ID 목록 (tabId 또는 tabId:subId) */
  allowedTabIds?: string[];
  /** 의존성 비교용. 내용이 같으면 동일 문자열로 전달해 무한 실행 방지 */
  allowedTabIdsKey: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const redirectedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!operatorOnly || !allowedTabIds?.length) return;

    const current = pathname ?? "";
    if (isOperatorAllowedPath(allowedTabIds, current)) {
      redirectedPathRef.current = null;
      return;
    }

    // 같은 경로로 중복 리다이렉트 방지 (pathname 갱신 전 재실행 시 무한루프 방지)
    if (redirectedPathRef.current === current) return;
    redirectedPathRef.current = current;

    const target = getFirstAllowedPath(allowedTabIds);
    router.replace(target);
  // allowedTabIds는 의존성에서 제외. 참조가 매 렌더마다 바뀌어 무한 실행되므로 allowedTabIdsKey만 사용
  }, [operatorOnly, allowedTabIdsKey, pathname, router]);

  return null;
}
