"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Menu } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

const navItems = [
  { label: "리거", href: "/rigger" },
  { label: "버니", href: "/bunnies" },
  { label: "버니 게시판", href: "/bunnies/board" },
  { label: "승인 요청", href: "/bunny-approvals" },
  { label: "쪽지", href: "/notes" },
  {
    label: "클래스",
    sub: [
      { label: "초급", href: "/class/beginner" },
      { label: "중급", href: "/class/intermediate" },
      { label: "고급", href: "/class/advanced" },
    ],
  },
  { label: "기타", href: "/etc" },
  { label: "뽐내기", href: "/showoff" },
] as const;

const navLinkClass =
  "block min-h-[44px] w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

export function MainNav({
  pendingBunnyApprovalsCount,
  unreadMessagesCount = 0,
  unreadNotesCount = 0,
  showApprovalRequestLink = false,
  showBunnyBoardLink = false,
}: {
  pendingBunnyApprovalsCount?: number;
  unreadMessagesCount?: number;
  unreadNotesCount?: number;
  /** 버니·관리자만 true. 리거일 때는 승인 요청 메뉴 숨김 */
  showApprovalRequestLink?: boolean;
  /** 버니·관리자만 true. 리거일 때는 버니 게시판 숨김 */
  showBunnyBoardLink?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pendingCount = pendingBunnyApprovalsCount ?? 0;
  const unreadCount = unreadMessagesCount ?? 0;
  const hasUnreadNotes = (unreadNotesCount ?? 0) > 0;
  const itemsToShow = navItems.filter((item) => {
    if ("href" in item && item.href === "/bunny-approvals")
      return showApprovalRequestLink;
    if ("href" in item && item.href === "/bunnies/board") return showBunnyBoardLink;
    return true;
  });

  return (
    <>
      {/* 모바일: 햄버거 + 시트 */}
      <div className="flex md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 min-h-[44px] min-w-[44px]"
              aria-label="메뉴 열기"
            >
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(85vw,20rem)]">
            <SheetHeader>
              <SheetTitle className="sr-only">메뉴</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1" aria-label="메인 메뉴">
              {itemsToShow.map((item) =>
                "sub" in item ? (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <span className="px-4 py-2 text-xs font-semibold text-foreground">
                      {item.label}
                    </span>
                    {item.sub.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          navLinkClass,
                          "pl-8",
                          pathname === sub.href && "bg-muted font-semibold",
                        )}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-label={item.href === "/notes" ? "쪽지" : undefined}
                    className={cn(
                      navLinkClass,
                      (pathname === item.href ||
                        (item.href === "/notes" &&
                          pathname.startsWith("/notes"))) &&
                        "bg-muted font-semibold",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {item.href === "/notes" ? (
                        <Mail
                          className={cn(
                            "size-5 shrink-0",
                            hasUnreadNotes &&
                              "text-blue-600 animate-pulse dark:text-blue-400",
                          )}
                          aria-hidden
                        />
                      ) : item.href === "/bunny-approvals" && pendingCount > 0 ? (
                        <span className="rounded-md border border-blue-300/60 bg-blue-50/70 px-2 py-0.5 font-semibold text-blue-600 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-400">
                          {item.label}
                        </span>
                      ) : (
                        <span>{item.label}</span>
                      )}
                    </span>
                  </Link>
                ),
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* PC: 가로 메뉴 + 클래스 드롭다운 */}
      <nav
        className="hidden items-center gap-1 md:flex"
        aria-label="메인 메뉴"
      >
        {itemsToShow.map((item) =>
          "sub" in item ? (
            <DropdownMenu key={item.label}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "min-h-9 font-medium",
                    pathname.startsWith("/class") && "bg-muted",
                  )}
                >
                  {item.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {item.sub.map((sub) => (
                  <DropdownMenuItem key={sub.href} asChild>
                    <Link
                      href={sub.href}
                      className={cn(
                        pathname === sub.href && "bg-muted font-medium",
                      )}
                    >
                      {sub.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn(
                "min-h-9 font-medium",
                (pathname === item.href ||
                  (item.href === "/notes" &&
                    pathname.startsWith("/notes"))) &&
                  "bg-muted",
              )}
              asChild
            >
              <Link
                href={item.href}
                aria-label={item.href === "/notes" ? "쪽지" : undefined}
              >
                <span className="inline-flex items-center gap-2">
                  {item.href === "/notes" ? (
                    <Mail
                      className={cn(
                        "size-5 shrink-0",
                        hasUnreadNotes &&
                          "text-blue-600 animate-pulse dark:text-blue-400",
                      )}
                      aria-hidden
                    />
                  ) : item.href === "/bunny-approvals" && pendingCount > 0 ? (
                    <span className="rounded-md border border-blue-300/60 bg-blue-50/70 px-2 py-0.5 font-semibold text-blue-600 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-400">
                      {item.label}
                    </span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </span>
              </Link>
            </Button>
          ),
        )}
      </nav>
    </>
  );
}
