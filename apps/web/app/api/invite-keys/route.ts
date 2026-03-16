import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { db, schema } from "@workspace/db";
import {
  getActiveSuspensionForUser,
  getMemberProfileByUserId,
  getUserCreatedAt,
} from "@workspace/db";
import { getInviteKeyMinAgeHours } from "@/lib/invite-key-config";

/** 인증키 유효 시간 (밀리초). 5분 */
const INVITE_KEY_VALID_MS = 5 * 60 * 1000;

/**
 * POST /api/invite-keys - 리거/버니가 인증키 생성 시 서버에 등록.
 * body: { key: string, memberType?: "rigger" | "bunny" }
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [suspension, profile] = await Promise.all([
    getActiveSuspensionForUser(session.user.id),
    getMemberProfileByUserId(session.user.id),
  ]);
  if (suspension) {
    return NextResponse.json(
      { error: "계정 사용 제한 중에는 이용할 수 없습니다." },
      { status: 403 },
    );
  }
  const allowedMemberTypes = ["rigger", "bunny"] as const;
  if (
    !profile?.memberType ||
    !allowedMemberTypes.includes(profile.memberType as (typeof allowedMemberTypes)[number])
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const createdAt = await getUserCreatedAt(session.user.id);
  const hours = getInviteKeyMinAgeHours();
  const allowedAt =
    createdAt != null
      ? new Date(createdAt.getTime() + hours * 60 * 60 * 1000)
      : null;
  const now = new Date();
  if (allowedAt != null && now < allowedAt) {
    return NextResponse.json(
      {
        error: "Forbidden",
        code: "INVITE_KEY_TOO_EARLY",
        allowedAt: allowedAt.toISOString(),
      },
      { status: 403 },
    );
  }
  let body: { key?: string; memberType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!key || key.length > 64) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  const rawType = body?.memberType;
  const memberType =
    rawType === "rigger" || rawType === "bunny" ? rawType : null;
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_KEY_VALID_MS);
  try {
    await db.insert(schema.inviteKeys).values({
      id,
      key,
      riggerId: session.user.id,
      memberType,
      expiresAt,
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Key already registered" }, { status: 409 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true, key }, { status: 201 });
}
