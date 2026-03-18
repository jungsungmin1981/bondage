import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { db, schema, eq } from "@workspace/db";
import { verify } from "otplib";
import { isAdmin } from "@/lib/admin";
import {
  createOtpVerifiedCookieValue,
  OTP_VERIFIED_COOKIE_NAME,
  OTP_VERIFIED_COOKIE_MAX_AGE,
} from "@/lib/otp-verified-cookie";

/**
 * POST /api/otp/confirm - OTP 등록을 완료합니다. pending 시크릿으로 코드 검증 후 user_totp에 저장.
 * body: { code: string } (6자리)
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json(
      { error: "운영진만 2단계 인증(OTP)을 설정할 수 있습니다." },
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
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "6자리 숫자를 입력해 주세요." },
      { status: 400 },
    );
  }

  const [pending] = await db
    .select()
    .from(schema.otpSetupPending)
    .where(eq(schema.otpSetupPending.userId, session.user.id))
    .limit(1);

  if (!pending) {
    return NextResponse.json(
      { error: "OTP 설정을 먼저 시작해 주세요. QR 코드를 다시 불러와 주세요." },
      { status: 400 },
    );
  }
  if (new Date() > pending.expiresAt) {
    await db
      .delete(schema.otpSetupPending)
      .where(eq(schema.otpSetupPending.userId, session.user.id));
    return NextResponse.json(
      { error: "설정 대기 시간이 만료되었습니다. QR 코드를 다시 불러와 주세요." },
      { status: 400 },
    );
  }

  const valid = await verify({ secret: pending.secret, token: code });
  if (!valid) {
    return NextResponse.json(
      { error: "코드가 일치하지 않습니다. 앱에 표시된 최신 6자리를 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    await db
      .insert(schema.userTotp)
      .values({
        userId: session.user.id,
        secret: pending.secret,
      })
      .onConflictDoUpdate({
        target: schema.userTotp.userId,
        set: {
          secret: pending.secret,
          createdAt: new Date(),
        },
      });
    await db
      .delete(schema.otpSetupPending)
      .where(eq(schema.otpSetupPending.userId, session.user.id));
  } catch (e) {
    console.error("[OTP confirm] save failed", e);
    return NextResponse.json(
      { error: "저장에 실패했습니다." },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true });
  const cookieValue = createOtpVerifiedCookieValue(session.user.id);
  res.cookies.set(OTP_VERIFIED_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OTP_VERIFIED_COOKIE_MAX_AGE,
  });
  return res;
}
