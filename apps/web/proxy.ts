import { NextRequest, NextResponse } from "next/server";

/** Better Auth 기본 세션 쿠키 이름 (customize하지 않았다면 이 이름 사용) */
const SESSION_COOKIE_NAME = "better-auth.session_token";

const SKIP_PREFIXES = ["/onboarding", "/login", "/register", "/api"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard")) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const skip = SKIP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (skip) return NextResponse.next();

  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes(SESSION_COOKIE_NAME)) return NextResponse.next();

  try {
    const url = new URL("/api/auth/get-session", request.url);
    const res = await fetch(url, { headers: { cookie } });
    if (!res.ok) return NextResponse.next();
    const session = (await res.json()) as {
      user?: { id?: string; memberType?: string; member_type?: string };
    } | null;
    if (!session?.user) return NextResponse.next();
    const memberType = session.user.memberType ?? session.user.member_type;
    if (!memberType) {
      try {
        const profileRes = await fetch(new URL("/api/me/profile", request.url), {
          headers: { cookie },
        });
        if (profileRes.ok) {
          const data = (await profileRes.json()) as { hasProfile?: boolean };
          if (data.hasProfile) return NextResponse.next();
        }
      } catch {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:ico|png|svg|webp)$).*)",
  ],
};

