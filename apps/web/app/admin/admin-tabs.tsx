"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { ADMIN_ONLY_TAB, ADMIN_TABS } from "@/lib/admin-tabs";
import { hasTabAccess, getFirstAllowedPathForTab, isOperatorAllowedPath, pathnameToTabSub, type OperatorTabId } from "@/lib/admin-operator-permissions";

function isAdminOnlyArea(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/admin-only") ||
    pathname.startsWith("/admin/invite-keys") ||
    pathname.startsWith("/admin/operator-permissions")
  );
}

function isActive(pathname: string, tab: { tabId: string; href: string }): boolean {
  if (tab.tabId === "admin-only") return isAdminOnlyArea(pathname);
  if (tab.tabId === "invite-keys") return pathname.startsWith("/admin/invite-keys");
  if (tab.tabId === "operator-permissions") return pathname.startsWith("/admin/operator-permissions");
  if (tab.tabId === "operators") return pathname.startsWith("/admin/operators");
  if (tab.tabId === "notice") return pathname.startsWith("/admin/notice");
  if (tab.tabId === "members") return pathname.startsWith("/admin/members");
  if (tab.tabId === "class") return pathname.startsWith("/admin/class") || pathname.startsWith("/admin/class-requests");
  if (tab.tabId === "images") return pathname.startsWith("/admin/images") || pathname.startsWith("/admin/watermark");
  if (tab.tabId === "tier") return pathname.startsWith("/admin/tier");
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

const tabClass = cn(
  "min-h-[44px] rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition",
  "hover:bg-muted hover:text-foreground",
);

export function AdminTabs({
  operatorOnly = false,
  allowedTabIds,
  hasPendingMembers = false,
  hasPendingClass = false,
}: {
  showInviteKeysTab?: boolean;
  operatorOnly?: boolean;
  allowedTabIds?: string[];
  hasPendingMembers?: boolean;
  hasPendingClass?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = operatorOnly && allowedTabIds
    ? ADMIN_TABS
        .filter((t) => hasTabAccess(allowedTabIds, t.tabId as OperatorTabId))
        .map((tab) => {
          const href = getFirstAllowedPathForTab(allowedTabIds, tab.tabId as OperatorTabId);
          const tabSub = pathname ? pathnameToTabSub(pathname) : null;
          const active = tabSub?.tabId === tab.tabId && isOperatorAllowedPath(allowedTabIds, pathname ?? "");
          return { label: tab.label, href, active, hasPending: (tab.tabId === "members" && hasPendingMembers) || (tab.tabId === "class" && hasPendingClass) };
        })
    : [
        { label: ADMIN_ONLY_TAB.label, href: ADMIN_ONLY_TAB.href, active: isActive(pathname, ADMIN_ONLY_TAB), hasPending: false },
        ...ADMIN_TABS.map((tab) => ({ label: tab.label, href: tab.href, active: isActive(pathname, tab), hasPending: (tab.tabId === "members" && hasPendingMembers) || (tab.tabId === "class" && hasPendingClass) })),
      ];

  const activeLabel = links.find((l) => l.active)?.label ?? "관리자";

  return (
    <>
      {/* 모바일: 상단 드롭다운 토글 버튼 */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-muted px-3 py-2.5 text-sm font-medium"
          aria-expanded={open}
          aria-label="관리자 메뉴 열기"
        >
          <span>{activeLabel}</span>
          {open ? <X className="size-4 shrink-0" /> : <Menu className="size-4 shrink-0" />}
        </button>
        {open && (
          <nav className="mt-1 flex flex-col gap-0.5 rounded-lg border border-border bg-background p-1 shadow-lg" aria-label="관리자 메뉴">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(tabClass, l.active && "bg-muted text-foreground", !l.active && l.hasPending && "text-amber-500")}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* 데스크탑: 기존 세로 메뉴 */}
      <nav className="hidden flex-col gap-0.5 sm:flex" aria-label="관리자 메뉴">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(tabClass, l.active && "bg-muted text-foreground", !l.active && l.hasPending && "text-amber-500")}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
