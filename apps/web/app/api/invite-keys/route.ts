import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { db, schema } from "@workspace/db";
import {
  getActiveSuspensionForUser,
  getMemberProfileByUserId,
  getNonExpiredInviteKeysForRiggerBunny,
  getUserCreatedAt,
} from "@workspace/db";
import { getInviteKeyMinAgeHours } from "@/lib/invite-key-config";

/** 인증키 유효 시간 (밀리초). 5분 */
const INVITE_KEY_VALID_MS = 5 * 60 * 1000;

/**
 * POST /api/invite-keys - 리거/버니가 인증키 생성 시 서버에 등록.
 * body: { key: string, memberType: "rigger" | "bunny" } — memberType 필수.
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
  if (!memberType) {
    return NextResponse.json(
      { error: "memberType는 'rigger' 또는 'bunny' 중 하나여야 합니다." },
      { status: 400 },
    );
  }
  const existing = await getNonExpiredInviteKeysForRiggerBunny(session.user.id);
  if (memberType === "rigger" && existing.rigger) {
    return NextResponse.json(
      { error: "리거 인증키가 아직 유효합니다. 만료 후 다시 생성해 주세요." },
      { status: 409 },
    );
  }
  if (memberType === "bunny" && existing.bunny) {
    return NextResponse.json(
      { error: "버니 인증키가 아직 유효합니다. 만료 후 다시 생성해 주세요." },
      { status: 409 },
    );
  }
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_KEY_VALID_MS);
  try {
    await db.insert(schema.inviteKeys).values({
      id,
      key,
      riggerId: session.user.id,
      createdByUserId: session.user.id,
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

/**
 * GET /api/invite-keys - 리거/버니 본인이 발급한 만료·미사용 인증키 조회 (리거/버니 각 최신 1건).
 */
export async function GET() {
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
  const data = await getNonExpiredInviteKeysForRiggerBunny(session.user.id);
  return NextResponse.json({
    rigger: data.rigger
      ? { key: data.rigger.key, expiresAt: data.rigger.expiresAt.toISOString() }
      : null,
    bunny: data.bunny
      ? { key: data.bunny.key, expiresAt: data.bunny.expiresAt.toISOString() }
      : null,
  });
}
