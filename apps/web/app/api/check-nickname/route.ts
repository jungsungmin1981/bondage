import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { getMemberProfileByUserId, isNicknameTaken } from "@workspace/db";

/**
 * GET /api/check-nickname?nickname=xxx
 * 닉네임 사용 가능 여부. 로그인 후 프로필 수정 시에는 본인 닉네임을 사용 가능으로 봄.
 */
export async function GET(request: NextRequest) {
  const nickname = request.nextUrl.searchParams.get("nickname");
  const trimmed = typeof nickname === "string" ? nickname.trim().slice(0, 200) : "";
  if (!trimmed) {
    return NextResponse.json({ available: false });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const profile = session?.user?.id ? await getMemberProfileByUserId(session.user.id) : null;
  const excludeUserId = profile ? session!.user.id : undefined;
  const taken = await isNicknameTaken(trimmed, excludeUserId);
  return NextResponse.json({ available: !taken });
}
