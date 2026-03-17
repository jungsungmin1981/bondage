"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

type BunnyBoardTabsProps = {
  boards: { slug: string; name: string }[];
};

export function BunnyBoardTabs({ boards }: BunnyBoardTabsProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-border">
      <nav className="flex gap-0 text-sm" aria-label="버니 게시판 탭">
        {boards.map((tab) => {
          const href = `/bunnies/board/${tab.slug}`;
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={tab.slug}
              href={href}
              className={cn(
                "min-h-[44px] flex-1 border-b-2 px-3 py-2.5 text-center font-medium transition sm:flex-initial sm:px-4",
                "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
                active && "border-primary text-foreground",
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
