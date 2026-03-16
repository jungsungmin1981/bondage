"use client";

import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";

const statusTabs = [
  { label: "미심사", status: "pending" as const },
  { label: "승인", status: "approved" as const },
  { label: "반려", status: "rejected" as const },
] as const;

type LevelPath = "beginner" | "intermediate" | "advanced";

export function AdminClassReviewStatusTabs({
  levelPath,
  currentStatus,
}: {
  levelPath: LevelPath;
  currentStatus: "pending" | "approved" | "rejected";
}) {
  const base = `/admin/class-review/${levelPath}`;

  return (
    <div className="mb-4 border-b border-border">
      <div className="flex flex-wrap gap-2 text-sm">
        {statusTabs.map((tab) => {
          const active = currentStatus === tab.status;
          return (
            <Link
              key={tab.status}
              href={`${base}/${tab.status}`}
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
