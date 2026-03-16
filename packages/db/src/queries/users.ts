import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

/**
 * 사용자 가입 시각 조회. 인증키 생성 가능 여부(가입 후 N시간 경과) 판단용.
 */
export async function getUserCreatedAt(
  userId: string,
): Promise<Date | null> {
  const rows = await db
    .select({ createdAt: schema.users.createdAt })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  const row = rows[0];
  return row?.createdAt ?? null;
}

/**
 * 가입 시 사용한 인증키의 member_type(rigger|bunny) 조회.
 * 유저에게 invite_key_id가 없거나, 해당 키에 member_type이 없으면 null.
 */
export async function getInviteKeyMemberTypeByUserId(
  userId: string,
): Promise<"rigger" | "bunny" | null> {
  const rows = await db
    .select({ memberType: schema.inviteKeys.memberType })
    .from(schema.users)
    .innerJoin(
      schema.inviteKeys,
      eq(schema.users.inviteKeyId, schema.inviteKeys.id),
    )
    .where(eq(schema.users.id, userId))
    .limit(1);
  const v = rows[0]?.memberType;
  if (v === "rigger" || v === "bunny") return v;
  return null;
}

/**
 * 이메일로 사용자 조회 (대소문자 무시). 아이디 찾기 등에 사용.
 * 없으면 null.
 */
export async function getUserByEmail(email: string): Promise<{
  id: string;
  username: string | null;
} | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;
  const rows = await db
    .select({ id: schema.users.id, username: schema.users.username })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = lower(${trimmed})`)
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, username: row.username };
}

/**
 * 사용자 회원 구분값 설정. 세션에 노출되어 미들웨어에서 사용.
 */
export async function setUserMemberType(
  userId: string,
  memberType: "rigger" | "bunny",
): Promise<void> {
  await db
    .update(schema.users)
    .set({ memberType, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
}

/**
 * 이메일 목록에 해당하는 사용자 id 목록을 반환합니다.
 */
export async function getUserIdListByEmails(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(inArray(schema.users.email, emails));
  return rows.map((r) => r.id).filter((id): id is string => Boolean(id));
}
