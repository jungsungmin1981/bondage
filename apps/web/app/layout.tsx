import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@workspace/ui/lib/utils";
import { UserMenu } from "./user-menu";
import { MainNav } from "@/components/main-nav";
import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { isPrimaryAdmin } from "@/lib/admin";
import {
  getAllPendingApprovalsCount,
  getPendingApprovalsCountForBunny,
  getUnreadCountForUser,
  getUnreadDirectMessagesCountForUser,
  getMemberProfileByUserId,
} from "@workspace/db";
import { MessageIcon } from "@/components/message-icon";
import { SessionRevokedGuard } from "@/components/session-revoked-guard";
import { HeaderGuard } from "./header-guard";

function getCachedMemberProfile(userId: string) {
  return unstable_cache(
    () => getMemberProfileByUserId(userId),
    [`member-profile-${userId}`],
    { revalidate: 30 },
  )();
}

function getCachedPendingApprovalsCount(userId: string, isAdminUser: boolean) {
  return unstable_cache(
    () => isAdminUser ? getAllPendingApprovalsCount() : getPendingApprovalsCountForBunny(userId),
    [`pending-approvals-${isAdminUser ? "admin" : userId}`],
    { revalidate: 15 },
  )();
}

function getCachedUnreadCounts(userId: string) {
  return unstable_cache(
    async () => {
      const [messages, notes] = await Promise.all([
        getUnreadCountForUser(userId).catch(() => 0),
        getUnreadDirectMessagesCountForUser(userId).catch(() => 0),
      ]);
      return { messages, notes };
    },
    [`unread-counts-${userId}`],
    { revalidate: 10 },
  )();
}

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

/** 리거 미승인 시 허용 경로: 본인 리거 상세 및 그 하위, 인증·온보딩 등 */
function isAllowedForRiggerPending(pathname: string, profileId: string): boolean {
  const base = `/rigger/${profileId}`;
  if (pathname === base || pathname.startsWith(`${base}/`)) return true;
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/change-password")
  )
    return true;
  return false;
}

/** 운영진 미승인 시 허용 경로 (승인 대기 전용 페이지) */
function isAllowedForOperatorPending(pathname: string): boolean {
  if (pathname === "/admin/pending" || pathname === "/operator/pending") return true;
  if (pathname.startsWith("/operator/")) return true;
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/change-password")
  )
    return true;
  return false;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  // isPrimaryAdmin만 session으로 확인 (cookieCache로 memberType이 누락될 수 있으므로)
  const isPrimaryAdminUser = session ? isPrimaryAdmin(session) : false;

  const pathname = headersList.get("x-pathname") ?? "";

  const [memberProfile, unreadCounts] =
    await Promise.all([
      session ? getCachedMemberProfile(session.user.id) : Promise.resolve(null),
      session ? getCachedUnreadCounts(session.user.id) : Promise.resolve({ messages: 0, notes: 0 }),
    ]);
  const unreadMessagesCount = unreadCounts.messages;
  const unreadNotesCount = unreadCounts.notes;

  // memberProfile에서 실제 타입 판별 (session.user.memberType 대신)
  const isAdminUser =
    isPrimaryAdminUser ||
    (memberProfile?.memberType === "operator" && memberProfile?.status === "approved");

  const pendingBunnyApprovalsCount = session
    ? await getCachedPendingApprovalsCount(session.user.id, isAdminUser)
    : 0;

  const riggerPending =
    memberProfile?.memberType === "rigger" && memberProfile?.status !== "approved";
  const operatorPending =
    memberProfile?.memberType === "operator" && memberProfile?.status !== "approved";
  const riggerRedirectTarget =
    riggerPending && memberProfile?.id ? `/rigger/${memberProfile.id}` : null;
  const operatorRedirectTarget = operatorPending ? "/admin/pending" : null;
  const isApprovedOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "approved";

  if (
    riggerRedirectTarget &&
    pathname !== "" &&
    pathname !== riggerRedirectTarget &&
    !isAllowedForRiggerPending(pathname, memberProfile!.id)
  ) {
    redirect(riggerRedirectTarget);
  }
  if (
    operatorRedirectTarget &&
    pathname !== "" &&
    pathname !== operatorRedirectTarget &&
    !isAllowedForOperatorPending(pathname)
  ) {
    redirect(operatorRedirectTarget);
  }

  const showApprovalRequestLink =
    !!session && (isAdminUser || memberProfile?.memberType === "bunny");
  const showBunnyBoardLink = memberProfile?.memberType === "bunny" || isAdminUser;

  // UserMenu에 내려줄 닉네임·프로필 링크 (서버에서 계산 → 클라이언트 API 호출 불필요)
  const adminNickname =
    isPrimaryAdmin(session) && process.env.ADMIN_NICKNAME?.trim()
      ? process.env.ADMIN_NICKNAME.trim()
      : null;
  const menuNickname =
    adminNickname ?? memberProfile?.nickname?.trim() ?? session?.user?.email ?? null;

  let menuProfileLink: string | null = null;
  if (session) {
    if (isAdminUser) {
      menuProfileLink = `/admin/operators/${encodeURIComponent(session.user.id)}`;
    } else if (memberProfile?.memberType === "rigger" && memberProfile?.id) {
      menuProfileLink = `/rigger/${encodeURIComponent(memberProfile.id)}`;
    } else if (memberProfile?.memberType === "bunny" && memberProfile?.id) {
      menuProfileLink = `/bunnies/${encodeURIComponent(memberProfile.id)}`;
    } else if (memberProfile) {
      menuProfileLink = "/profile/edit";
    }
  }

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
          <SessionRevokedGuard isLoggedIn={!!session} />
          <div className="flex min-h-[100dvh] flex-col">
            <HeaderGuard operatorPending={operatorPending}>
              <header
                className="flex items-center justify-between gap-2 border-b px-3 py-2 sm:gap-4 sm:px-6 sm:py-3"
                style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <Link
                    href={
                      operatorPending
                        ? "/admin/pending"
                        : riggerPending && memberProfile?.id
                          ? `/rigger/${memberProfile.id}`
                          : "/"
                    }
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-sm font-medium sm:min-h-0 sm:min-w-0"
                  >
                    Bondage
                  </Link>
                  <MainNav
                    pendingBunnyApprovalsCount={pendingBunnyApprovalsCount}
                    unreadMessagesCount={unreadMessagesCount}
                    unreadNotesCount={unreadNotesCount}
                    showApprovalRequestLink={showApprovalRequestLink}
                    showBunnyBoardLink={showBunnyBoardLink}
                    showBoardLink={!!session}
                    riggerPendingRestriction={riggerPending && !!memberProfile?.id}
                    riggerProfileId={memberProfile?.id ?? undefined}
                    operatorPendingRestriction={operatorPending}
                    showAdminLink={!!session && isAdminUser}
                    showOperatorLink={!!session && isApprovedOperator && !isAdminUser}
                    chatHref={
                      operatorPending
                        ? "/admin/pending"
                        : riggerPending && memberProfile?.id
                          ? `/rigger/${memberProfile.id}`
                          : "/messages"
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  {session && isApprovedOperator && (
                    <Link
                      href="/admin"
                      className="hidden min-h-[44px] items-center justify-center rounded-lg border bg-muted/30 px-3 text-xs font-semibold shadow-sm shadow-black/5 transition hover:bg-muted/60 sm:inline-flex sm:text-sm"
                    >
                      운영진
                    </Link>
                  )}
                  {session && isAdminUser && (
                    <Link
                      href="/admin"
                      className="hidden min-h-[44px] items-center justify-center rounded-lg border bg-muted/30 px-3 text-xs font-semibold shadow-sm shadow-black/5 transition hover:bg-muted/60 sm:inline-flex sm:text-sm"
                    >
                      관리자
                    </Link>
                  )}
                  <Link
                    href={
                      operatorPending
                        ? "/admin/pending"
                        : riggerPending && memberProfile?.id
                          ? `/rigger/${memberProfile.id}`
                          : "/messages"
                    }
                    className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border bg-muted/30 px-2 shadow-sm shadow-black/5 transition hover:bg-muted/60 sm:inline-flex"
                    aria-label="채팅"
                  >
                    <MessageIcon hasUnread={unreadMessagesCount > 0} />
                  </Link>
                  <UserMenu
                    nickname={menuNickname}
                    profileLink={menuProfileLink}
                    isLoggedIn={!!session}
                  />
                </div>
              </header>
            </HeaderGuard>
            <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden px-3 pb-[env(safe-area-inset-bottom)] sm:px-6">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

