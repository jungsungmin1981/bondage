import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { db, schema, eq, getMemberProfileByUserId } from "@workspace/db";
import { isAdmin } from "@/lib/admin";

/**
 * POST /api/admin/operators/[userId]/reset-otp
 * 관리자 전용. 해당 운영진의 OTP(TOTP) 정보를 삭제하여, 다음 로그인 시 OTP 등록 페이지가 보이게 함.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const profile = await getMemberProfileByUserId(userId);
  if (!profile || profile.memberType !== "operator") {
    return NextResponse.json({ error: "해당 사용자는 운영진이 아닙니다." }, { status: 404 });
  }

  await db.delete(schema.userTotp).where(eq(schema.userTotp.userId, userId));
  await db.delete(schema.otpSetupPending).where(eq(schema.otpSetupPending.userId, userId));

  return NextResponse.json({ ok: true });
}
