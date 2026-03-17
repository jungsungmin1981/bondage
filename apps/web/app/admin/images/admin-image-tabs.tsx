"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const imageTabs = [
  { label: "워터마크", href: "/admin/watermark" },
  { label: "메인 백그라운드", href: "/admin/images/main-background" },
  { label: "이미지 리사이징", href: "/admin/images/resize" },
  { label: "브론즈", href: "/admin/images/bronze" },
  { label: "실버", href: "/admin/images/silver" },
  { label: "골드", href: "/admin/images/gold" },
  { label: "마스터", href: "/admin/images/master" },
  { label: "감옥", href: "/admin/images/jail" },
  { label: "기부", href: "/admin/images/donation" },
] as const;

export function AdminImageTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-4 border-b border-border">
      <div className="flex flex-wrap gap-2 text-sm">
        {imageTabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center border-b-2 border-transparent px-3 py-2 font-medium text-muted-foreground transition",
                "hover:text-foreground hover:border-muted-foreground",
                active &&
                  "border-primary text-foreground",
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
