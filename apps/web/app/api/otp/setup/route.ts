import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { db, schema, eq } from "@workspace/db";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { getMemberProfileByUserId } from "@workspace/db";
import { isAdmin } from "@/lib/admin";

const OTP_PENDING_EXPIRES_MS = 10 * 60 * 1000; // 10분

/**
 * GET /api/otp/setup - OTP 등록을 시작합니다. 시크릿 생성 후 pending에 저장하고 QR Data URL 반환.
 * 운영진 또는 관리자만 호출 가능.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await getMemberProfileByUserId(session.user.id);
  const allowed = isAdmin(session) || profile?.memberType === "operator";
  if (!allowed) {
    return NextResponse.json(
      { error: "운영진만 2단계 인증(OTP)을 설정할 수 있습니다." },
      { status: 403 },
    );
  }

  const secret = generateSecret();
  const expiresAt = new Date(Date.now() + OTP_PENDING_EXPIRES_MS);
  const label =
    session.user.email ?? session.user.username ?? session.user.id;
  const uri = generateURI({
    issuer: "Bondage",
    label: String(label).slice(0, 64),
    secret,
  });

  try {
    await db
      .insert(schema.otpSetupPending)
      .values({
        userId: session.user.id,
        secret,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: schema.otpSetupPending.userId,
        set: {
          secret,
          expiresAt,
          createdAt: new Date(),
        },
      });
  } catch (e) {
    console.error("[OTP setup] insert pending failed", e);
    return NextResponse.json(
      { error: "설정을 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  let qrDataUrl: string;
  try {
    qrDataUrl = await QRCode.toDataURL(uri, {
      width: 256,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  } catch (e) {
    console.error("[OTP setup] QR generation failed", e);
    return NextResponse.json(
      { error: "QR 코드 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    qrDataUrl,
    secret,
    expiresAt: expiresAt.toISOString(),
  });
}
