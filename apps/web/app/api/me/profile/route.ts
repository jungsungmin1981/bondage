import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import {
  getMemberProfileByUserId,
  getInviteKeyMemberTypeByUserId,
} from "@workspace/db";
import { isAdmin, isPrimaryAdmin } from "@/lib/admin";

/**
 * GET /api/me/profile - 현재 세션 사용자의 프로필 존재 여부 및 닉네임.
 * 프로필 미완료 리다이렉트용, 상단 메뉴 닉네임 표시용.
 * 프로필 없을 때 inviteKeyType(인증키 기준 리거/버니) 반환 — proxy 온보딩 리다이렉트용.
 * 관리자·운영진이면 operatorDetailUserId 반환 — 닉네임 클릭 시 운영진 상세로 이동용.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ hasProfile: false });
  }
  const profile = await getMemberProfileByUserId(session.user.id);
  const inviteKeyType = profile
    ? undefined
    : await getInviteKeyMemberTypeByUserId(session.user.id);
  const isAdminOrOperator = isAdmin(session);
  const nickname =
    isPrimaryAdmin(session) && process.env.ADMIN_NICKNAME?.trim()
      ? process.env.ADMIN_NICKNAME.trim()
      : profile?.nickname?.trim() || undefined;
  return NextResponse.json({
    hasProfile: !!profile,
    nickname,
    memberType: profile?.memberType ?? undefined,
    profileId: profile?.id ?? undefined,
    inviteKeyType: inviteKeyType ?? undefined,
    /** 관리자 또는 운영진이면 닉네임 클릭 시 /admin/operators/[userId] 로 이동 */
    operatorDetailUserId: isAdminOrOperator ? session.user.id : undefined,
  });
}
