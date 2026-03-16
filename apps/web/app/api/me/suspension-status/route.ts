import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import {
  getActiveSuspensionForUser,
  getMemberProfileByUserId,
} from "@workspace/db";

/**
 * GET /api/me/suspension-status - 현재 세션 사용자의 이용제한(정지) 여부 및 허용 프로필 경로.
 * 정지 시 프로필 페이지만 허용할 때 클라이언트에서 리다이렉트용.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ suspended: false });
  }
  const suspension = await getActiveSuspensionForUser(session.user.id);
  if (!suspension) {
    return NextResponse.json({ suspended: false });
  }
  const profile = await getMemberProfileByUserId(session.user.id);
  const profileId = profile?.id ?? undefined;
  const memberType = profile?.memberType ?? undefined;
  return NextResponse.json({
    suspended: true,
    profileId,
    memberType,
    suspendedUntil: suspension.suspendedUntil?.toISOString() ?? null,
  });
}
