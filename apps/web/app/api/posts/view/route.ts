import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  incrementSharedBoardPostViewCount,
  incrementBunnyBoardPostViewCount,
} from "@workspace/db";

export async function POST(request: Request) {
  try {
    const { postId, boardType } = await request.json() as {
      postId: string;
      boardType: "shared" | "bunny";
    };

    if (!postId || !boardType) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const cookieKey = `vp_${boardType}_${postId}`;
    const cookieStore = await cookies();

    // 24시간 내 같은 게시글 조회 시 카운트 안 함
    if (cookieStore.get(cookieKey)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (boardType === "shared") {
      await incrementSharedBoardPostViewCount(postId);
    } else {
      await incrementBunnyBoardPostViewCount(postId);
    }

    const response = NextResponse.json({ ok: true });
    // 24시간 쿠키 설정
    response.cookies.set(cookieKey, "1", {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
