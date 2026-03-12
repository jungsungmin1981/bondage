"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const tabs = [
  { label: "리거 승인", href: "/admin/riggers" },
  { label: "클래스", href: "/admin/class" },
  { label: "워터마크", href: "/admin/watermark" },
  { label: "이미지", href: "/admin/images" },
] as const;

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-4 flex justify-start">
      <div className="inline-flex rounded-full bg-muted/60 p-1 text-sm shadow-sm">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium text-muted-foreground transition",
                "hover:text-foreground",
                active && "bg-background text-foreground shadow-sm",
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

