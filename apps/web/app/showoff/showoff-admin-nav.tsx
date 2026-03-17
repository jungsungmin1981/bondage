"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

export function ShowoffAdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  if (!isAdmin) return null;

  const tabs = [
    { label: "사진 등록", href: "/showoff" },
    { label: "투표", href: "/showoff/vote" },
  ] as const;

  return (
    <nav
      className="mt-2 flex gap-1 rounded-lg border bg-muted/50 p-1 sm:mt-3"
      aria-label="관리자 페이지 이동"
    >
      {tabs.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "min-h-[44px] flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors sm:flex-initial",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
