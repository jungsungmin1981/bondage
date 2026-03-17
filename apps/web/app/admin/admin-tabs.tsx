"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const tabs = [
  { label: "회원관리", href: "/admin/members" },
  { label: "클래스", href: "/admin/class" },
  { label: "공지사항", href: "/admin/notice/bunny" },
  { label: "이미지", href: "/admin/images" },
] as const;

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="관리자 메뉴">
      {tabs.map((tab) => {
        const active =
          tab.href === "/admin/notice/bunny"
            ? pathname.startsWith("/admin/notice")
            : tab.href === "/admin/members"
              ? pathname.startsWith("/admin/members")
              : tab.href === "/admin/class"
                ? pathname.startsWith("/admin/class")
                : tab.href === "/admin/images"
                  ? pathname.startsWith("/admin/images") || pathname.startsWith("/admin/watermark")
                  : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "min-h-[44px] rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition",
              "hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

