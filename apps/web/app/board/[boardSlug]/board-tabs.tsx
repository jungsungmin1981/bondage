"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const TABS = [
  { label: "공지사항", slug: "notice" },
  { label: "자유게시판", slug: "free" },
  { label: "제안하기", slug: "suggestion" },
  { label: "Q & A", slug: "qna" },
] as const;

export function BoardTabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="border-b border-border">
      <nav
        className="flex gap-0 text-sm"
        aria-label="게시판 탭"
      >
        {TABS.map((tab) => {
          const href = `/board/${tab.slug}`;
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={tab.slug}
              href={href}
              prefetch={false}
              onMouseEnter={() => router.prefetch(href)}
              onTouchStart={() => router.prefetch(href)}
              className={cn(
                "min-h-[44px] flex-1 border-b-2 px-3 py-2.5 text-center font-medium transition sm:flex-initial sm:px-4",
                "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
                active && "border-primary text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
