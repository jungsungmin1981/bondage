import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { db, schema, eq } from "@workspace/db";
import { verify } from "otplib";
import { getMemberProfileByUserId } from "@workspace/db";
import { isPrimaryAdmin } from "@/lib/admin";
import {
  createOtpVerifiedCookieValue,
  OTP_VERIFIED_COOKIE_NAME,
  OTP_VERIFIED_COOKIE_MAX_AGE,
} from "@/lib/otp-verified-cookie";

/**
 * POST /api/otp/verify - 로그인 후 OTP 코드 검증. 성공 시 otp_verified 쿠키 설정.
 * 주 관리자가 ADMIN_OTP_RESET_CODE와 일치하는 코드를 입력하면 OTP를 초기화하고 { reset: true } 반환(재등록용).
 * body: { code: string } (6자리 또는 관리자 초기화 코드)
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    profile?.memberType === "operator" && profile?.status === "approved";
  const isPrimaryAdminUser = isPrimaryAdmin(session);
  if (!isApprovedOperator && !isPrimaryAdminUser) {
    return NextResponse.json(
      { error: "승인된 운영진 또는 관리자만 OTP 검증을 사용할 수 있습니다." },
      { status: 403 },
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";

  // 주 관리자 전용: 특정 코드 입력 시 OTP 초기화 후 재등록하도록 함
  const resetCode = process.env.ADMIN_OTP_RESET_CODE?.trim() ?? "";
  if (
    isPrimaryAdminUser &&
    resetCode.length > 0 &&
    code === resetCode
  ) {
    await db.delete(schema.userTotp).where(eq(schema.userTotp.userId, session.user.id));
    await db
      .delete(schema.otpSetupPending)
      .where(eq(schema.otpSetupPending.userId, session.user.id));
    return NextResponse.json({ ok: true, reset: true });
  }

  const [totpRow] = await db
    .select({ secret: schema.userTotp.secret })
    .from(schema.userTotp)
    .where(eq(schema.userTotp.userId, session.user.id))
    .limit(1);
  if (!totpRow) {
    return NextResponse.json(
      { error: "OTP가 등록되어 있지 않습니다. 먼저 설정해 주세요." },
      { status: 400 },
    );
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "6자리 숫자를 입력해 주세요." },
      { status: 400 },
    );
  }

  const valid = await verify({ secret: totpRow.secret, token: code });
  if (!valid) {
    return NextResponse.json(
      { error: "코드가 일치하지 않습니다. 앱에 표시된 최신 6자리를 입력해 주세요." },
      { status: 400 },
    );
  }

  const cookieValue = createOtpVerifiedCookieValue(session.user.id);
  const res = NextResponse.json({ ok: true });
  // http://localhost에서는 Secure 쿠키가 저장되지 않으므로, 실제 HTTPS일 때만 secure: true
  const baseUrl = process.env.BETTER_AUTH_URL || "";
  const isSecureOrigin = baseUrl.startsWith("https://");
  res.cookies.set(OTP_VERIFIED_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: isSecureOrigin,
    sameSite: "lax",
    path: "/",
    maxAge: OTP_VERIFIED_COOKIE_MAX_AGE,
  });
  return res;
}
