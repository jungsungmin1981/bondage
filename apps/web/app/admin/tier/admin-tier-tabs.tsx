"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const tierTabs = [
  { label: "리거 등급관리", href: "/admin/tier/riggers" },
  { label: "등급 조건 설정", href: "/admin/tier/conditions" },
] as const;

export function AdminTierTabs({ allowedHrefs }: { allowedHrefs?: string[] }) {
  const pathname = usePathname();
  const tabs =
    allowedHrefs === undefined
      ? [...tierTabs]
      : tierTabs.filter((tab) => allowedHrefs.includes(tab.href));

  return (
    <div className="mb-4 border-b border-border">
      <div className="flex flex-wrap gap-2 text-sm">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center border-b-2 border-transparent px-3 py-2 font-medium text-muted-foreground transition",
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
