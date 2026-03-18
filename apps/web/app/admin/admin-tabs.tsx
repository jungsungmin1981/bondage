"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  if (tab.tabId === "class") return pathname.startsWith("/admin/class");
  if (tab.tabId === "images") return pathname.startsWith("/admin/images") || pathname.startsWith("/admin/watermark");
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

const tabClass = cn(
  "min-h-[44px] rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition",
  "hover:bg-muted hover:text-foreground",
);

export function AdminTabs({
  operatorOnly = false,
  allowedTabIds,
}: {
  showInviteKeysTab?: boolean;
  operatorOnly?: boolean;
  /** 운영진용: 허용된 탭/하위 ID 목록 (tabId 또는 tabId:subId) */
  allowedTabIds?: string[];
}) {
  const pathname = usePathname();

  if (operatorOnly && allowedTabIds) {
    const tabs = ADMIN_TABS.filter((t) => hasTabAccess(allowedTabIds, t.tabId as OperatorTabId));
    const tabSub = pathname ? pathnameToTabSub(pathname) : null;
    return (
      <nav className="flex flex-col gap-0.5" aria-label="관리자 메뉴">
        {tabs.map((tab) => {
          const href = getFirstAllowedPathForTab(allowedTabIds, tab.tabId as OperatorTabId);
          const active = tabSub?.tabId === tab.tabId && isOperatorAllowedPath(allowedTabIds, pathname ?? "");
          return (
            <Link
              key={tab.tabId}
              href={href}
              className={cn(tabClass, active && "bg-muted text-foreground")}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5" aria-label="관리자 메뉴">
      <Link
        href={ADMIN_ONLY_TAB.href}
        className={cn(tabClass, isActive(pathname, ADMIN_ONLY_TAB) && "bg-muted text-foreground")}
      >
        {ADMIN_ONLY_TAB.label}
      </Link>
      {ADMIN_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(tabClass, isActive(pathname, tab) && "bg-muted text-foreground")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
