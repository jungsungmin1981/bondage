import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
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
 * 가입 시 사용한 인증키의 member_type(rigger|bunny|operator) 조회.
 * 유저에게 invite_key_id가 없거나, 해당 키에 member_type이 없으면 null.
 */
export async function getInviteKeyMemberTypeByUserId(
  userId: string,
): Promise<"rigger" | "bunny" | "operator" | null> {
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
  if (v === "rigger" || v === "bunny" || v === "operator") return v;
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
  memberType: "rigger" | "bunny" | "operator",
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

/**
 * 이메일 또는 아이디(username)에 해당하는 사용자 id 목록. 관리자 식별용.
 */
export async function getUserIdListByEmailOrUsername(
  emails: string[],
  usernames: string[],
): Promise<string[]> {
  const conditions: ReturnType<typeof sql>[] = [];
  if (emails.length > 0)
    conditions.push(inArray(schema.users.email, emails));
  if (usernames.length > 0)
    conditions.push(inArray(schema.users.username, usernames));
  if (conditions.length === 0) return [];
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(or(...conditions));
  return [...new Set(rows.map((r) => r.id).filter((id): id is string => Boolean(id)))];
}

export type OperatorUserRow = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  createdAt: Date;
  /** member_profiles.status (pending | approved | rejected). 프로필 없으면 null */
  status: string | null;
  /** member_profiles.nickname */
  nickname: string | null;
  /** member_profiles.card_image_url */
  cardImageUrl: string | null;
};

/**
 * member_type이 'operator'인 사용자 목록. 가입일 최신순. 프로필 승인 상태 포함.
 */
export async function getOperatorUsers(): Promise<OperatorUserRow[]> {
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      username: schema.users.username,
      createdAt: schema.users.createdAt,
      status: schema.memberProfiles.status,
      nickname: schema.memberProfiles.nickname,
      cardImageUrl: schema.memberProfiles.cardImageUrl,
    })
    .from(schema.users)
    .leftJoin(
      schema.memberProfiles,
      and(
        eq(schema.memberProfiles.userId, schema.users.id),
        eq(schema.memberProfiles.memberType, "operator"),
      ),
    )
    .where(eq(schema.users.memberType, "operator"))
    .orderBy(desc(schema.users.createdAt));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name ?? null,
    username: r.username ?? null,
    createdAt: r.createdAt,
    status: r.status ?? null,
    nickname: r.nickname ?? null,
    cardImageUrl: r.cardImageUrl ?? null,
  }));
}

/**
 * 운영진 목록 + 주 관리자(adminEmails/adminUsernames에 해당하는 계정) 포함.
 * 관리자 계정은 member_type이 operator가 아니어도 목록에 포함되며 status는 'approved'로 표시.
 */
export async function getOperatorUsersIncludingAdminIdentifiers(
  adminEmails: string[],
  adminUsernames: string[],
): Promise<OperatorUserRow[]> {
  const operators = await getOperatorUsers();
  const operatorIds = new Set(operators.map((o) => o.id));
  const adminIds = await getUserIdListByEmailOrUsername(
    adminEmails.filter((e) => typeof e === "string" && e.trim().length > 0),
    adminUsernames.filter((u) => typeof u === "string" && u.trim().length > 0),
  );
  const toFetch = adminIds.filter((id) => !operatorIds.has(id));
  if (toFetch.length === 0) return operators;

  const adminRows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      username: schema.users.username,
      createdAt: schema.users.createdAt,
      nickname: schema.memberProfiles.nickname,
      cardImageUrl: schema.memberProfiles.cardImageUrl,
    })
    .from(schema.users)
    .leftJoin(
      schema.memberProfiles,
      eq(schema.memberProfiles.userId, schema.users.id),
    )
    .where(inArray(schema.users.id, toFetch));

  const adminAsRows: OperatorUserRow[] = adminRows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name ?? null,
    username: r.username ?? null,
    createdAt: r.createdAt,
    status: "approved",
    nickname: r.nickname ?? null,
    cardImageUrl: r.cardImageUrl ?? null,
  }));

  const merged = [...adminAsRows, ...operators];
  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return merged;
}

export type GetOperatorUserByIdOptions = {
  /** 주 관리자로 취급할 이메일 목록. 해당 사용자도 운영진 상세로 조회됨 */
  adminEmails?: string[];
  /** 주 관리자로 취급할 아이디(username) 목록 */
  adminUsernames?: string[];
};

/**
 * member_type이 'operator'인 사용자 한 명 조회. 없으면 null.
 * options에 adminEmails/adminUsernames를 넘기면, 해당 식별자에 맞는 사용자도 운영진 상세로 조회됨(status 'approved').
 */
export async function getOperatorUserById(
  userId: string,
  options?: GetOperatorUserByIdOptions,
): Promise<OperatorUserRow | null> {
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      username: schema.users.username,
      createdAt: schema.users.createdAt,
      status: schema.memberProfiles.status,
      nickname: schema.memberProfiles.nickname,
      cardImageUrl: schema.memberProfiles.cardImageUrl,
    })
    .from(schema.users)
    .leftJoin(
      schema.memberProfiles,
      and(
        eq(schema.memberProfiles.userId, schema.users.id),
        eq(schema.memberProfiles.memberType, "operator"),
      ),
    )
    .where(
      and(eq(schema.users.id, userId), eq(schema.users.memberType, "operator")),
    )
    .limit(1);
  const r = rows[0];
  if (r) {
    return {
      id: r.id,
      email: r.email,
      name: r.name ?? null,
      username: r.username ?? null,
      createdAt: r.createdAt,
      status: r.status ?? null,
      nickname: r.nickname ?? null,
      cardImageUrl: r.cardImageUrl ?? null,
    };
  }

  if (options?.adminEmails?.length || options?.adminUsernames?.length) {
    const adminIds = await getUserIdListByEmailOrUsername(
      options.adminEmails ?? [],
      options.adminUsernames ?? [],
    );
    if (!adminIds.includes(userId)) return null;
    const userRows = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        username: schema.users.username,
        createdAt: schema.users.createdAt,
        nickname: schema.memberProfiles.nickname,
        cardImageUrl: schema.memberProfiles.cardImageUrl,
      })
      .from(schema.users)
      .leftJoin(
        schema.memberProfiles,
        eq(schema.memberProfiles.userId, schema.users.id),
      )
      .where(eq(schema.users.id, userId))
      .limit(1);
    const u = userRows[0];
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      name: u.name ?? null,
      username: u.username ?? null,
      createdAt: u.createdAt,
      status: "approved",
      nickname: u.nickname ?? null,
      cardImageUrl: u.cardImageUrl ?? null,
    };
  }

  return null;
}

/** 발급자가 만료·미사용인 인증키 조회. memberType별 최신 1건. */
export async function getNonExpiredInviteKeysByCreatedBy(createdByUserId: string): Promise<{
  rigger: { key: string; expiresAt: Date } | null;
  bunny: { key: string; expiresAt: Date } | null;
  operator: { key: string; expiresAt: Date } | null;
}> {
  const now = new Date();
  const rows = await db
    .select({ key: schema.inviteKeys.key, memberType: schema.inviteKeys.memberType, expiresAt: schema.inviteKeys.expiresAt })
    .from(schema.inviteKeys)
    .where(
      and(
        eq(schema.inviteKeys.createdByUserId, createdByUserId),
        isNull(schema.inviteKeys.usedAt),
        gt(schema.inviteKeys.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.inviteKeys.createdAt));
  const rigger = rows.find((r) => r.memberType === "rigger");
  const bunny = rows.find((r) => r.memberType === "bunny");
  const operator = rows.find((r) => r.memberType === "operator");
  return {
    rigger: rigger ? { key: rigger.key, expiresAt: rigger.expiresAt } : null,
    bunny: bunny ? { key: bunny.key, expiresAt: bunny.expiresAt } : null,
    operator: operator ? { key: operator.key, expiresAt: operator.expiresAt } : null,
  };
}

/** 리거/버니 상세용: created_by_user_id 또는 rigger_id로 만든 만료·미사용 인증키 (memberType별 최신 1건). */
export async function getNonExpiredInviteKeysForRiggerBunny(userId: string): Promise<{
  rigger: { key: string; expiresAt: Date } | null;
  bunny: { key: string; expiresAt: Date } | null;
}> {
  const now = new Date();
  const rows = await db
    .select({ key: schema.inviteKeys.key, memberType: schema.inviteKeys.memberType, expiresAt: schema.inviteKeys.expiresAt })
    .from(schema.inviteKeys)
    .where(
      and(
        or(
          eq(schema.inviteKeys.createdByUserId, userId),
          eq(schema.inviteKeys.riggerId, userId),
        ),
        isNull(schema.inviteKeys.usedAt),
        gt(schema.inviteKeys.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.inviteKeys.createdAt));
  const rigger = rows.find((r) => r.memberType === "rigger");
  const bunny = rows.find((r) => r.memberType === "bunny");
  return {
    rigger: rigger ? { key: rigger.key, expiresAt: rigger.expiresAt } : null,
    bunny: bunny ? { key: bunny.key, expiresAt: bunny.expiresAt } : null,
  };
}
