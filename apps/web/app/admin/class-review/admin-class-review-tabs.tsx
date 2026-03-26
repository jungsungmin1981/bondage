"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const classReviewTabs = [
  { label: "초급", href: "/admin/class-review/beginner/pending", base: "/admin/class-review/beginner", key: "beginner" as const },
  { label: "중급", href: "/admin/class-review/intermediate/pending", base: "/admin/class-review/intermediate", key: "intermediate" as const },
  { label: "고급", href: "/admin/class-review/advanced/pending", base: "/admin/class-review/advanced", key: "advanced" as const },
];

type PendingCounts = { beginner: number; intermediate: number; advanced: number };

export function AdminClassReviewTabs({
  pendingCounts,
}: {
  pendingCounts?: PendingCounts;
}) {
  const pathname = usePathname();

  return (
    <div className="mb-4 border-b border-border">
      <div className="flex flex-wrap gap-2 text-sm">
        {classReviewTabs.map((tab) => {
          const active =
            pathname === tab.base || pathname.startsWith(tab.base + "/");
          const count = pendingCounts?.[tab.key] ?? 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 font-medium transition",
                "hover:text-foreground hover:border-muted-foreground",
                active ? "border-primary text-foreground" : "text-muted-foreground",
                !active && count > 0 && "text-amber-500",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-4",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                )}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
