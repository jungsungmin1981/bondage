import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { db, schema, eq } from "@workspace/db";

/**
 * GET /api/otp/status - 현재 사용자의 OTP 등록 여부.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ enabled: false });
  }
  const [row] = await db
    .select({ userId: schema.userTotp.userId })
    .from(schema.userTotp)
    .where(eq(schema.userTotp.userId, session.user.id))
    .limit(1);
  return NextResponse.json({ enabled: !!row });
}
