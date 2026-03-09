"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
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
  {
    label: "클레스",
    sub: [
      { label: "초급", href: "/class/beginner" },
      { label: "중급", href: "/class/intermediate" },
      { label: "고급", href: "/class/advanced" },
    ],
  },
  { label: "기타", href: "/etc" },
  { label: "뽐내기", href: "/showoff" },
  { label: "워터마크", href: "/watermark" },
] as const;

const navLinkClass =
  "block min-h-[44px] w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
              {navItems.map((item) =>
                "sub" in item ? (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <span className="px-4 py-2 text-xs font-semibold text-muted-foreground">
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
                    className={cn(
                      navLinkClass,
                      pathname === item.href && "bg-muted font-semibold",
                    )}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* PC: 가로 메뉴 + 클레스 드롭다운 */}
      <nav
        className="hidden items-center gap-1 md:flex"
        aria-label="메인 메뉴"
      >
        {navItems.map((item) =>
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
                pathname === item.href && "bg-muted",
              )}
              asChild
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ),
        )}
      </nav>
    </>
  );
}
