import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type SuspensionRow = {
  id: string;
  userId: string;
  suspendedUntil: Date | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
};

/**
 * 현재 유효한 정지가 있는 userId 집합. 목록에서 카드 오버레이 등에 사용.
 */
export async function getSuspendedUserIds(): Promise<Set<string>> {
  const now = new Date();
  const rows = await db
    .select({ userId: schema.userSuspensions.userId })
    .from(schema.userSuspensions)
    .where(
      or(
        sql`${schema.userSuspensions.suspendedUntil} IS NULL`,
        gt(schema.userSuspensions.suspendedUntil, now),
      ),
    );
  return new Set(rows.map((r) => r.userId));
}

/**
 * 해당 유저의 현재 유효한 정지 1건 조회.
 * suspended_until이 null이거나 미래이면 유효.
 */
export async function getActiveSuspensionForUser(
  userId: string,
): Promise<SuspensionRow | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(schema.userSuspensions)
    .where(
      and(
        eq(schema.userSuspensions.userId, userId),
        or(
          sql`${schema.userSuspensions.suspendedUntil} IS NULL`,
          gt(schema.userSuspensions.suspendedUntil, now),
        ),
      ),
    )
    .orderBy(sql`${schema.userSuspensions.createdAt} DESC`)
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    suspendedUntil: row.suspendedUntil,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  };
}

/**
 * 이용제한(정지) 부여. 기존 유효 정지는 유지하고 새 건 추가.
 * durationDays: 1,3,5,10,15,30 또는 null(영구).
 */
export async function insertSuspension(params: {
  userId: string;
  durationDays: number | null;
  reason?: string | null;
  createdByUserId: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const id = crypto.randomUUID();
  const now = new Date();
  const suspendedUntil =
    params.durationDays == null
      ? null
      : new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000);
  await db.insert(schema.userSuspensions).values({
    id,
    userId: params.userId,
    suspendedUntil,
    reason: params.reason ?? null,
    createdByUserId: params.createdByUserId ?? null,
  });
  return { ok: true, id };
}

/**
 * 정지 해제. 해당 유저의 현재 유효한 정지를 즉시 만료 처리(suspended_until = now).
 */
export async function liftSuspension(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const active = await getActiveSuspensionForUser(userId);
  if (!active) {
    return { ok: false, error: "해당 회원에게 유효한 정지가 없습니다." };
  }
  const now = new Date();
  await db
    .update(schema.userSuspensions)
    .set({ suspendedUntil: now })
    .where(eq(schema.userSuspensions.id, active.id));
  return { ok: true };
}

export type ActiveSuspensionWithProfile = {
  id: string;
  profileId: string;
  userId: string;
  suspendedUntil: Date | null;
  reason: string | null;
  createdAt: Date;
  nickname: string;
  memberType: string;
};

/**
 * 현재 유효한 정지 목록 (닉네임·회원구분 포함). 관리자 이용제한 목록용.
 * suspended_until이 null이거나 미래인 건만, 최신순.
 */
export async function getActiveSuspensionsWithProfile(
  limit = 100,
): Promise<ActiveSuspensionWithProfile[]> {
  const now = new Date();
  const rows = await db
    .select({
      id: schema.userSuspensions.id,
      profileId: schema.memberProfiles.id,
      userId: schema.userSuspensions.userId,
      suspendedUntil: schema.userSuspensions.suspendedUntil,
      reason: schema.userSuspensions.reason,
      createdAt: schema.userSuspensions.createdAt,
      nickname: schema.memberProfiles.nickname,
      memberType: schema.memberProfiles.memberType,
    })
    .from(schema.userSuspensions)
    .innerJoin(
      schema.memberProfiles,
      eq(schema.userSuspensions.userId, schema.memberProfiles.userId),
    )
    .where(
      or(
        sql`${schema.userSuspensions.suspendedUntil} IS NULL`,
        gt(schema.userSuspensions.suspendedUntil, now),
      ),
    )
    .orderBy(desc(schema.userSuspensions.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    profileId: r.profileId,
    userId: r.userId,
    suspendedUntil: r.suspendedUntil,
    reason: r.reason,
    createdAt: r.createdAt,
    nickname: r.nickname,
    memberType: r.memberType,
  }));
}
