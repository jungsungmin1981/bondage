import { NextRequest, NextResponse } from "next/server";

/** Better Auth 기본 세션 쿠키 이름 (customize하지 않았다면 이 이름 사용) */
const SESSION_COOKIE_NAME = "better-auth.session_token";

const SKIP_PREFIXES = ["/onboarding", "/login", "/register", "/reset-password", "/api"];

/** pathname을 요청 헤더에 넣어 레이아웃에서 읽을 수 있게 함 */
function nextWithPathname(request: NextRequest, pathname: string) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

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

/** 운영진 미승인 시 허용 경로: 승인 대기 전용 페이지, 로그아웃 등 */
function isAllowedForOperatorPending(pathname: string): boolean {
  if (pathname === "/admin/pending" || pathname === "/operator/pending") return true;
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

/** OTP 게이트에서 스킵할 경로 (여기 있으면 requires-otp-gate 체크 안 함) */
const OTP_SKIP_PATHS = [
  "/operator/otp-gate",
  "/operator/setup-otp",
  "/operator/pending",
  "/admin/pending",
  "/api",
  "/login",
  "/register",
  "/_next",
  "/favicon",
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookie = request.headers.get("cookie") ?? "";

  // OTP 게이트: 승인된 운영진+TOTP인데 미검증 시 /operator/otp-gate로
  const otpSkip = OTP_SKIP_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!otpSkip) {
    try {
      const otpRes = await fetch(
        new URL("/api/me/requires-otp-gate", request.url),
        { headers: { cookie }, cache: "no-store" },
      );
      if (otpRes.ok) {
        const otpData = (await otpRes.json().catch(() => ({}))) as {
          redirect?: string | null;
        };
        if (otpData?.redirect) {
          return NextResponse.redirect(new URL(otpData.redirect, request.url));
        }
      }
    } catch {
      // 실패 시 통과
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const skip = SKIP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (skip) return nextWithPathname(request, pathname);

  if (!cookie.includes(SESSION_COOKIE_NAME))
    return nextWithPathname(request, pathname);

  try {
    const url = new URL("/api/auth/get-session", request.url);
    const res = await fetch(url, { headers: { cookie } });
    if (!res.ok) return nextWithPathname(request, pathname);
    const session = (await res.json()) as {
      user?: { id?: string; memberType?: string; member_type?: string };
    } | null;
    if (!session?.user) return nextWithPathname(request, pathname);
    const memberType = session.user.memberType ?? session.user.member_type;
    if (!memberType) {
      try {
        const profileRes = await fetch(new URL("/api/me/profile", request.url), {
          headers: { cookie },
        });
        if (profileRes.ok) {
          const data = (await profileRes.json()) as {
            hasProfile?: boolean;
            inviteKeyType?: "rigger" | "bunny" | "operator";
          };
          if (data.hasProfile) return nextWithPathname(request, pathname);
          // 세션에 memberType이 없어도 인증키 타입이 있으면 해당 온보딩으로 보냄
          if (data.inviteKeyType === "rigger") {
            return NextResponse.redirect(new URL("/onboarding/rigger", request.url));
          }
          if (data.inviteKeyType === "bunny") {
            return NextResponse.redirect(new URL("/onboarding/bunny", request.url));
          }
          if (data.inviteKeyType === "operator") {
            return NextResponse.redirect(new URL("/onboarding/operator", request.url));
          }
        }
      } catch {
        return nextWithPathname(request, pathname);
      }
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // 리거 미승인: 본인 리거 상세만 허용 (레이아웃에서도 체크하지만 여기서 먼저 막음)
    if (memberType === "rigger") {
      try {
        const statusRes = await fetch(
          new URL("/api/me/suspension-status", request.url),
          { headers: { cookie } },
        );
        if (statusRes.ok) {
          const data = (await statusRes.json()) as {
            riggerPending?: boolean;
            profileId?: string;
            operatorPending?: boolean;
          };
          if (
            data.riggerPending &&
            data.profileId &&
            !isAllowedForRiggerPending(pathname, data.profileId)
          ) {
            return NextResponse.redirect(
              new URL(`/rigger/${data.profileId}`, request.url),
            );
          }
        }
      } catch {
        // 실패 시 레이아웃에서 처리하도록 통과
      }
    }

    // 운영진 미승인: /admin/pending 만 허용
    if (memberType === "operator") {
      try {
        const statusRes = await fetch(
          new URL("/api/me/suspension-status", request.url),
          { headers: { cookie } },
        );
        if (statusRes.ok) {
          const data = (await statusRes.json()) as {
            operatorPending?: boolean;
          };
          if (
            data.operatorPending &&
            !isAllowedForOperatorPending(pathname)
          ) {
            return NextResponse.redirect(
              new URL("/admin/pending", request.url),
            );
          }
        }
      } catch {
        // 실패 시 레이아웃에서 처리하도록 통과
      }
    }
  } catch {
    return nextWithPathname(request, pathname);
  }

  return nextWithPathname(request, pathname);
}

export const config = {
  matcher: [
    "/dashboard",
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:ico|png|svg|webp)$).*)",
  ],
};

