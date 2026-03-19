import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { db, getMemberProfileByUserId, getNonExpiredInviteKeysByCreatedBy, schema } from "@workspace/db";
import { isAdmin, isPrimaryAdmin } from "@/lib/admin";

/** 인증키 유효 시간 (밀리초). 리거/버니: 30분, 운영자: 1시간 */
const INVITE_KEY_VALID_MS_RIGGER_BUNNY = 30 * 60 * 1000;
const INVITE_KEY_VALID_MS_OPERATOR = 60 * 60 * 1000;

const ALLOWED_MEMBER_TYPES = ["rigger", "bunny", "operator"] as const;
type AdminInviteKeyMemberType = (typeof ALLOWED_MEMBER_TYPES)[number];

function isAllowedMemberType(v: unknown): v is AdminInviteKeyMemberType {
  return typeof v === "string" && ALLOWED_MEMBER_TYPES.includes(v as AdminInviteKeyMemberType);
}

/**
 * POST /api/admin/invite-keys - 관리자가 인증키 생성.
 * body: { key: string, memberType?: "rigger" | "bunny" | "operator" }. 기본값 "operator".
 * 리거/버니: isAdmin이면 생성 가능. 운영자: isPrimaryAdmin일 때만 생성 가능.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdminUser = isAdmin(session);
  const memberProfile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "approved";
  const canCreateAny = isAdminUser || isApprovedOperator;
  if (!canCreateAny) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { key?: string; memberType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!key || key.length > 64) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  const memberType: AdminInviteKeyMemberType = isAllowedMemberType(body?.memberType)
    ? body.memberType
    : "operator";
  if (memberType === "operator" && !isPrimaryAdmin(session)) {
    return NextResponse.json(
      { error: "운영자 인증키는 주 관리자만 생성할 수 있습니다." },
      { status: 403 },
    );
  }
  const existing = await getNonExpiredInviteKeysByCreatedBy(session.user.id);
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
  if (memberType === "operator" && existing.operator) {
    return NextResponse.json(
      { error: "운영자 인증키가 아직 유효합니다. 만료 후 다시 생성해 주세요." },
      { status: 409 },
    );
  }
  const id = crypto.randomUUID();
  const validMs =
    memberType === "operator" ? INVITE_KEY_VALID_MS_OPERATOR : INVITE_KEY_VALID_MS_RIGGER_BUNNY;
  const expiresAt = new Date(Date.now() + validMs);
  try {
    await db.insert(schema.inviteKeys).values({
      id,
      key,
      riggerId: null,
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
  return NextResponse.json({ ok: true, key, memberType }, { status: 201 });
}

/**
 * GET /api/admin/invite-keys - 내가 발급한 만료·미사용 인증키 조회 (리거/버니/운영자 각 최신 1건).
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberProfile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "approved";
  if (!isAdmin(session) && !isApprovedOperator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await getNonExpiredInviteKeysByCreatedBy(session.user.id);
  return NextResponse.json({
    rigger: data.rigger
      ? { key: data.rigger.key, expiresAt: data.rigger.expiresAt.toISOString() }
      : null,
    bunny: data.bunny
      ? { key: data.bunny.key, expiresAt: data.bunny.expiresAt.toISOString() }
      : null,
    operator: data.operator
      ? { key: data.operator.key, expiresAt: data.operator.expiresAt.toISOString() }
      : null,
  });
}
