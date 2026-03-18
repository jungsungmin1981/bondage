"use client";

import { usePathname } from "next/navigation";

/**
 * 운영진 승인 대기 시 /admin/pending 에서는 헤더를 숨김.
 * pathname은 클라이언트에서만 정확히 알 수 있어 이 컴포넌트로 감쌈.
 */
export function HeaderGuard({
  operatorPending,
  children,
}: {
  operatorPending: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (operatorPending && pathname === "/admin/pending") return null;
  return <>{children}</>;
}
