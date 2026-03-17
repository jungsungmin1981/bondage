"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const noticeTabs = [
  { label: "공지사항", href: "/admin/notice/rigger" },
  { label: "Q & A", href: "/admin/notice/qna" },
  { label: "버니 전용 공지사항", href: "/admin/notice/bunny" },
  { label: "버니 전용 Q & A", href: "/admin/notice/bunny-qna" },
] as const;

export function AdminNoticeTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-4 border-b border-border">
      <div className="flex flex-wrap gap-2 text-sm">
        {noticeTabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex min-h-[44px] items-center border-b-2 border-transparent px-3 py-2 font-medium text-muted-foreground transition",
                "hover:text-foreground hover:border-muted-foreground",
                active && "border-primary text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
