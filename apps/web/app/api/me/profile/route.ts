import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import {
  getMemberProfileByUserId,
  getInviteKeyMemberTypeByUserId,
} from "@workspace/db";

/**
 * GET /api/me/profile - 현재 세션 사용자의 프로필 존재 여부 및 닉네임.
 * 프로필 미완료 리다이렉트용, 상단 메뉴 닉네임 표시용.
 * 프로필 없을 때 inviteKeyType(인증키 기준 리거/버니) 반환 — proxy 온보딩 리다이렉트용.
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
  return NextResponse.json({
    hasProfile: !!profile,
    nickname: profile?.nickname?.trim() || undefined,
    memberType: profile?.memberType ?? undefined,
    profileId: profile?.id ?? undefined,
    inviteKeyType: inviteKeyType ?? undefined,
  });
}
