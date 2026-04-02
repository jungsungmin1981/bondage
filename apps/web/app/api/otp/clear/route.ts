import { NextResponse } from "next/server";
import { OTP_VERIFIED_COOKIE_NAME } from "@/lib/otp-verified-cookie";

/**
 * POST /api/otp/clear
 * otp_verified 쿠키를 만료시켜 OTP 재인증을 요구하도록 한다.
 * 비활동 자동 만료 등 클라이언트에서 호출.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";
  const isSecureOrigin = baseUrl.startsWith("https://");
  res.cookies.set(OTP_VERIFIED_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecureOrigin,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
