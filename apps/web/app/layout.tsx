import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";

import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@workspace/ui/lib/utils";
import { UserMenu } from "./user-menu";
import { MainNav } from "@/components/main-nav";
import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { isAdmin } from "@/lib/admin";
import {
  getAllPendingApprovalsCount,
  getPendingApprovalsCountForBunny,
  getUnreadCountForUser,
} from "@workspace/db";
import { Mail } from "lucide-react";

const APP_NAME = "Bondage";
const APP_DESCRIPTION = "리거·클래스·버니 승인";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s - ${APP_NAME}` },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const pendingBunnyApprovalsCount = !session
    ? 0
    : isAdmin(session)
      ? await getAllPendingApprovalsCount()
      : await getPendingApprovalsCountForBunny(session.user.id);
  const unreadMessagesCount = !session
    ? 0
    : await getUnreadCountForUser(session.user.id).catch(() => 0);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <body
        suppressHydrationWarning
        className="[touch-action:manipulation]"
        style={{
          WebkitTextSizeAdjust: "100%",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <ThemeProvider>
          <div className="flex min-h-[100dvh] flex-col">
            <header
              className="flex items-center justify-between gap-2 border-b px-3 py-2 sm:gap-4 sm:px-6 sm:py-3"
              style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <Link
                  href="/"
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-sm font-medium sm:min-h-0 sm:min-w-0"
                >
                  Bondage
                </Link>
                <MainNav pendingBunnyApprovalsCount={pendingBunnyApprovalsCount} />
              </div>
              <div className="flex items-center gap-2">
                {session && isAdmin(session) && (
                  <Link
                    href="/admin"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border bg-muted/30 px-3 text-xs font-semibold shadow-sm shadow-black/5 transition hover:bg-muted/60 sm:text-sm"
                  >
                    관리자
                  </Link>
                )}
                <Link
                  href="/messages"
                  className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border bg-muted/30 px-2 shadow-sm shadow-black/5 transition hover:bg-muted/60"
                  aria-label="쪽지"
                >
                  <Mail className="size-5 text-foreground" strokeWidth={2} />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex items-center gap-1 rounded-full border border-blue-600/30 bg-blue-50/60 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-blue-700">
                      <span className="relative inline-flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600/60 opacity-50" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                      </span>
                      {unreadMessagesCount}
                    </span>
                  )}
                </Link>
                <UserMenu />
              </div>
            </header>
            <main className="flex-1 overflow-x-hidden px-3 pb-[env(safe-area-inset-bottom)] sm:px-6">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

