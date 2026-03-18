import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { db, schema, eq } from "@workspace/db";
import { getMemberProfileByUserId } from "@workspace/db";
import { isPrimaryAdmin } from "@/lib/admin";
import { verifyOtpVerifiedCookie, OTP_VERIFIED_COOKIE_NAME } from "@/lib/otp-verified-cookie";

/**
 * GET /api/me/requires-otp-gate
 * 승인된 운영진 또는 주 관리자이고 TOTP가 등록되어 있는데 otp_verified 쿠키가 없으면 { redirect: "/operator/otp-gate" } 반환.
 * 미들웨어에서 사용.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ redirect: null });
  }

  const profile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    profile?.memberType === "operator" && profile?.status === "approved";
  const isPrimaryAdminUser = isPrimaryAdmin(session);
  if (!isApprovedOperator && !isPrimaryAdminUser) {
    return NextResponse.json({ redirect: null });
  }

  const [totpRow] = await db
    .select({ userId: schema.userTotp.userId })
    .from(schema.userTotp)
    .where(eq(schema.userTotp.userId, session.user.id))
    .limit(1);
  if (!totpRow) {
    return NextResponse.json({ redirect: null });
  }

  const cookieStore = await headers().then((h) => h.get("cookie") ?? "");
  const match = cookieStore.match(new RegExp(`${OTP_VERIFIED_COOKIE_NAME}=([^;]+)`));
  const cookieValue = match?.[1]?.trim();
  if (verifyOtpVerifiedCookie(cookieValue, session.user.id)) {
    return NextResponse.json({ redirect: null });
  }

  return NextResponse.json({ redirect: "/operator/otp-gate" });
}
