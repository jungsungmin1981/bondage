import { NextRequest, NextResponse } from "next/server";

/** Better Auth 기본 세션 쿠키 이름 (customize하지 않았다면 이 이름 사용) */
const SESSION_COOKIE_NAME = "better-auth.session_token";

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard"],
};

