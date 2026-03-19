"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { label: "월간 핫픽", href: "/showoff" },
  {
    label: "클래스",
    sub: [
      { label: "초급", href: "/class/beginner" },
      { label: "중급", href: "/class/intermediate" },
      { label: "고급", href: "/class/advanced" },
    ],
  },
  { label: "리거", href: "/rigger" },
  { label: "버니", href: "/bunnies" },
  { label: "게시판", href: "/board", showWhen: "board" as const },
  { label: "버니 게시판", href: "/bunnies/board" },
  { label: "승인 요청", href: "/bunny-approvals" },
  { label: "기타", href: "/etc" },
  { label: "쪽지", href: "/notes" },
] as const;const navLinkClass =
  "block min-h-[44px] w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

export function MainNav({
  pendingBunnyApprovalsCount,
  unreadMessagesCount = 0,
  unreadNotesCount = 0,
  showApprovalRequestLink = false,
  showBunnyBoardLink = false,
  showBoardLink = false,
  riggerPendingRestriction = false,
  riggerProfileId,
  operatorPendingRestriction = false,
  showAdminLink = false,
  showOperatorLink = false,
  chatHref,
}: {
  pendingBunnyApprovalsCount?: number;
  unreadMessagesCount?: number;
  unreadNotesCount?: number;
  /** 버니·관리자만 true. 리거일 때는 승인 요청 메뉴 숨김 */
  showApprovalRequestLink?: boolean;
  /** 버니·관리자만 true. 리거일 때는 버니 게시판 숨김 */
  showBunnyBoardLink?: boolean;
  /** 로그인 시 true. 공용 게시판 링크 표시 */
  showBoardLink?: boolean;
  /** 리거 미승인 시 true. 메뉴 클릭 시 다른 페이지 진입 없이 본인 리거 페이지만 이동 */
  riggerPendingRestriction?: boolean;
  riggerProfileId?: string;
  /** 운영진 미승인 시 true. 메뉴 클릭 시 /operator/pending 만 이동 */
  operatorPendingRestriction?: boolean;
  /** 모바일 메뉴 시트에 관리자 링크 표시 */
  showAdminLink?: boolean;
  /** 모바일 메뉴 시트에 운영진 링크 표시 */
  showOperatorLink?: boolean;
  /** 모바일 메뉴 시트에 표시할 채팅 링크 href */
  chatHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pendingCount = pendingBunnyApprovalsCount ?? 0;
  const unreadCount = unreadMessagesCount ?? 0;
  const hasUnreadNotes = (unreadNotesCount ?? 0) > 0;
  const onlyRiggerHref =
    riggerPendingRestriction && riggerProfileId
      ? `/rigger/${riggerProfileId}`
      : null;
  const onlyOperatorHref = operatorPendingRestriction ? "/operator/pending" : null;
  const onlyHref = onlyRiggerHref ?? onlyOperatorHref;

  const itemsToShow = navItems.filter((item) => {
    if ("href" in item && item.href === "/bunny-approvals")
      return showApprovalRequestLink;
    if ("href" in item && item.href === "/bunnies/board") return showBunnyBoardLink;
    if ("showWhen" in item && item.showWhen === "board") return showBoardLink;
    return true;
  });

  return (
    <>
      {/* 모바일: 햄버거 + 시트 */}
      <div className="flex sm:hidden">
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
              {/* 운영진/관리자 링크 - 모바일 메뉴 최상단 */}
              {(showOperatorLink || showAdminLink) && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className={cn(
                    navLinkClass,
                    "font-semibold text-primary",
                    pathname.startsWith("/admin") && "bg-muted",
                  )}
                >
                  {showAdminLink ? "관리자" : "운영진"}
                </Link>
              )}
              {(showOperatorLink || showAdminLink) && (
                <hr className="my-1 border-border" />
              )}
              {itemsToShow.map((item) =>
                "sub" in item ? (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <span className="px-4 py-2 text-xs font-semibold text-foreground">
                      {item.label}
                    </span>
                    {item.sub.map((sub) => (
                      <Link
                        key={sub.href}
                        href={onlyHref ?? sub.href}
                        prefetch={false}
                        onMouseEnter={() => router.prefetch(onlyHref ?? sub.href)}
                        onTouchStart={() => router.prefetch(onlyHref ?? sub.href)}
                        onClick={() => setOpen(false)}
                        className={cn(
                          navLinkClass,
                          "pl-8",
                          pathname === (onlyHref ?? sub.href) &&
                            "bg-muted font-semibold",
                        )}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={onlyHref ?? item.href}
                    prefetch={false}
                    onMouseEnter={() => router.prefetch(onlyHref ?? item.href)}
                    onTouchStart={() => router.prefetch(onlyHref ?? item.href)}
                    onClick={() => setOpen(false)}
                    aria-label={item.href === "/notes" ? "쪽지" : undefined}
                    className={cn(
                      navLinkClass,
                      (pathname === (onlyHref ?? item.href) ||
                        (!onlyHref &&
                          item.href === "/notes" &&
                          pathname.startsWith("/notes")) ||
                        (!onlyHref &&
                          item.href === "/board" &&
                          pathname.startsWith("/board"))) &&
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
              {/* 채팅 링크 - 모바일 메뉴 하단 */}
              {chatHref && (
                <>
                  <hr className="my-1 border-border" />
                  <Link
                    href={chatHref}
                    onClick={() => setOpen(false)}
                    className={cn(
                      navLinkClass,
                      pathname.startsWith("/messages") && "bg-muted font-semibold",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Mail
                        className={cn(
                          "size-5 shrink-0",
                          unreadCount > 0 && "text-blue-600 animate-pulse dark:text-blue-400",
                        )}
                        aria-hidden
                      />
                      채팅
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </span>
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* PC: 가로 메뉴 + 클래스 드롭다운 */}
      <nav
        className="hidden items-center gap-1 sm:flex"
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
                      href={onlyHref ?? sub.href}
                      prefetch={false}
                      onMouseEnter={() => router.prefetch(onlyHref ?? sub.href)}
                      onTouchStart={() => router.prefetch(onlyHref ?? sub.href)}
                      className={cn(
                        pathname === (onlyHref ?? sub.href) &&
                          "bg-muted font-medium",
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
                (pathname === (onlyHref ?? item.href) ||
                  (!onlyHref &&
                    item.href === "/notes" &&
                    pathname.startsWith("/notes")) ||
                  (!onlyHref &&
                    item.href === "/board" &&
                    pathname.startsWith("/board"))) &&
                  "bg-muted",
              )}
              asChild
            >
              <Link
                href={onlyHref ?? item.href}
                prefetch={false}
                onMouseEnter={() => router.prefetch(onlyHref ?? item.href)}
                onTouchStart={() => router.prefetch(onlyHref ?? item.href)}
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
