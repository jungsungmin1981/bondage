"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const sectionTabs = [
  { label: "클래스 심사", href: "/admin/class-review", pendingKey: "classReview" as const },
  { label: "클래스 등록", href: "/admin/class", pendingKey: null },
  { label: "클래스 요청", href: "/admin/class-requests", pendingKey: null },
];

export function AdminClassSectionTabs({
  hasPendingClassReview = false,
}: {
  hasPendingClassReview?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="mb-4 border-b border-border">
      <div className="flex flex-wrap gap-2 text-sm">
        {sectionTabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const hasPending = tab.pendingKey === "classReview" && hasPendingClassReview;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 font-medium transition",
                "hover:text-foreground hover:border-muted-foreground",
                active ? "border-primary text-foreground" : "text-muted-foreground",
                !active && hasPending && "text-amber-500",
              )}
            >
              {tab.label}
              {hasPending && !active && (
                <span className="inline-flex size-2 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
