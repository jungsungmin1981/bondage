"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const conditionTabs = [
  { label: "브론즈", href: "/admin/tier/conditions/bronze" },
  { label: "실버",   href: "/admin/tier/conditions/silver" },
  { label: "골드",   href: "/admin/tier/conditions/gold" },
  { label: "레전드", href: "/admin/tier/conditions/legend" },
] as const;

export function TierConditionsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 border-b border-border">
      <div className="flex flex-wrap gap-2 text-sm">
        {conditionTabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
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
