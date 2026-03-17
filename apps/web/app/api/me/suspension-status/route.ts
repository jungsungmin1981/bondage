import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import {
  getActiveSuspensionForUser,
  getMemberProfileByUserId,
} from "@workspace/db";

/**
 * GET /api/me/suspension-status
 * - suspended: 이용제한(정지) 시 프로필 페이지만 허용할 때 클라이언트 리다이렉트용.
 * - riggerPending: 리거 미승인 시 본인 리거 상세(/rigger/[id])만 허용할 때 사용.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ suspended: false, riggerPending: false });
  }
  const profile = await getMemberProfileByUserId(session.user.id);
  const profileId = profile?.id ?? undefined;
  const memberType = profile?.memberType ?? undefined;

  const suspension = await getActiveSuspensionForUser(session.user.id);
  if (suspension) {
    return NextResponse.json({
      suspended: true,
      riggerPending: false,
      profileId,
      memberType,
      suspendedUntil: suspension.suspendedUntil?.toISOString() ?? null,
    });
  }

  const riggerPending =
    memberType === "rigger" && profile?.status !== "approved";
  return NextResponse.json({
    suspended: false,
    riggerPending: !!riggerPending && !!profileId,
    profileId: riggerPending ? profileId : undefined,
    memberType: riggerPending ? "rigger" : undefined,
  });
}
