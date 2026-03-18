"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AdminLayoutContent({
  isPendingOperator,
  children,
  sidebarAndMain,
}: {
  isPendingOperator: boolean;
  children: React.ReactNode;
  sidebarAndMain: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!isPendingOperator) return;
    if (!pathname || pathname === "/admin/pending") return;
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace("/admin/pending");
  }, [isPendingOperator, pathname, router]);

  if (isPendingOperator) {
    return <>{children}</>;
  }

  return <>{sidebarAndMain}</>;
}
