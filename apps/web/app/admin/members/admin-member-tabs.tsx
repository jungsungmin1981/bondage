"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const memberTabs = [
  { label: "리거승인", href: "/admin/members/riggers" },
  { label: "이용제한", href: "/admin/members/restrictions" },
] as const;

export function AdminMemberTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-4 border-b border-border">
      <div className="flex flex-wrap gap-2 text-sm">
        {memberTabs.map((tab) => {
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
