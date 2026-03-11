import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";
import {
  getVisibilityAfterApprovalByPostId,
  setRiggerPostVisibilityByPostId,
} from "./rigger-photos";

/** 버니용: pending 승인요청 건수 */
export async function getPendingApprovalsCountForBunny(
  bunnyUserId: string,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.bunnyApprovals)
    .where(
      and(
        eq(schema.bunnyApprovals.bunnyUserId, bunnyUserId),
        eq(schema.bunnyApprovals.status, "pending"),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

/** 관리자용: pending 승인요청 전체 건수 */
export async function getAllPendingApprovalsCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.bunnyApprovals)
    .where(eq(schema.bunnyApprovals.status, "pending"));
  return Number(rows[0]?.count ?? 0);
}

/**
 * postId별로 승인 요청된 버니의 닉네임(또는 이름) 목록을 반환.
 * pending 상태인 bunny_approvals만 대상, users.name 우선, 없으면 email 로컬부.
 */
export async function getRequestedBunnyNamesByPostIds(
  postIds: string[],
): Promise<Map<string, string[]>> {
  if (postIds.length === 0) return new Map();

  const rows = await db
    .select({
      postId: schema.bunnyApprovals.postId,
      name: schema.users.name,
      email: schema.users.email,
    })
    .from(schema.bunnyApprovals)
    .innerJoin(
      schema.users,
      eq(schema.bunnyApprovals.bunnyUserId, schema.users.id),
    )
    .where(
      and(
        inArray(schema.bunnyApprovals.postId, postIds),
        eq(schema.bunnyApprovals.status, "pending"),
      ),
    );

  const map = new Map<string, string[]>();
  for (const r of rows) {
    const label =
      (r.name && String(r.name).trim()) ||
      (r.email ? r.email.replace(/@.*$/, "") : "버니");
    const key = r.postId;
    if (!map.has(key)) map.set(key, []);
    const arr = map.get(key)!;
    if (!arr.includes(label)) arr.push(label);
  }
  return map;
}

export type BunnyApprovalStatus = {
  postId: string;
  bunnyUserId: string;
  name: string | null;
  email: string;
  status: string;
};

/**
 * 주어진 userId가 승인 요청된 버니인 postId 집합을 반환.
 * (pending 게시물을 해당 버니에게도 노출할 때 사용)
 */
export async function getPostIdsWhereUserIsRequestedBunny(
  postIds: string[],
  bunnyUserId: string,
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const rows = await db
    .select({ postId: schema.bunnyApprovals.postId })
    .from(schema.bunnyApprovals)
    .where(
      and(
        inArray(schema.bunnyApprovals.postId, postIds),
        eq(schema.bunnyApprovals.bunnyUserId, bunnyUserId),
      ),
    );
  return new Set(rows.map((r) => r.postId));
}

/**
 * postId 배열에 대해 각 버니의 승인 상태 전체(pending/approved/rejected)를 조회.
 */
export async function getBunnyApprovalStatusesByPostIds(
  postIds: string[],
): Promise<Map<string, BunnyApprovalStatus[]>> {
  if (postIds.length === 0) return new Map();

  const rows = await db
    .select({
      postId: schema.bunnyApprovals.postId,
      bunnyUserId: schema.bunnyApprovals.bunnyUserId,
      status: schema.bunnyApprovals.status,
      name: schema.users.name,
      email: schema.users.email,
    })
    .from(schema.bunnyApprovals)
    .innerJoin(
      schema.users,
      eq(schema.bunnyApprovals.bunnyUserId, schema.users.id),
    )
    .where(inArray(schema.bunnyApprovals.postId, postIds));

  const map = new Map<string, BunnyApprovalStatus[]>();
  for (const r of rows) {
    const key = r.postId;
    const current = map.get(key) ?? [];
    current.push(r);
    map.set(key, current);
  }
  return map;
}

export type PendingApprovalRow = {
  approvalId: string;
  postId: string;
  createdAt: Date;
  imagePath: string | null;
  caption: string | null;
  riggerId: string | null;
};

/** 승인 목록용: status, updatedAt, riggerNickname 포함 (pending / approved / rejected) */
export type BunnyApprovalListItem = PendingApprovalRow & {
  status: "pending" | "approved" | "rejected";
  updatedAt: Date | null;
  riggerNickname: string | null;
};

type ApprovalRowInput = {
  approvalId: string;
  postId: string;
  createdAt: Date | null;
  updatedAt?: Date | null;
  status?: string;
};

async function mapApprovalsToRows(
  approvals: ApprovalRowInput[],
): Promise<PendingApprovalRow[]> {
  return mapApprovalsToRowsWithStatus(approvals).then((rows) =>
    rows.map(
      ({ status: _s, updatedAt: _u, riggerNickname: _n, ...rest }) => rest,
    ),
  );
}

async function mapApprovalsToRowsWithStatus(
  approvals: ApprovalRowInput[],
): Promise<BunnyApprovalListItem[]> {
  if (approvals.length === 0) return [];

  const postIds = [...new Set(approvals.map((a) => a.postId))];
  const photos = await db
    .select({
      postId: schema.riggerPhotos.postId,
      riggerId: schema.riggerPhotos.riggerId,
      imagePath: schema.riggerPhotos.imagePath,
      caption: schema.riggerPhotos.caption,
      createdAt: schema.riggerPhotos.createdAt,
    })
    .from(schema.riggerPhotos)
    .where(inArray(schema.riggerPhotos.postId, postIds))
    .orderBy(asc(schema.riggerPhotos.postId), asc(schema.riggerPhotos.createdAt));

  const firstByPostId = new Map<string, (typeof photos)[number]>();
  for (const p of photos) {
    const key = p.postId ?? "";
    if (!firstByPostId.has(key)) firstByPostId.set(key, p);
  }

  const riggerIds = [
    ...new Set(
      photos.map((p) => p.riggerId).filter((id): id is string => id != null),
    ),
  ];
  const nicknameByRiggerId = new Map<string, string>();
  if (riggerIds.length > 0) {
    const profiles = await db
      .select({
        id: schema.memberProfiles.id,
        nickname: schema.memberProfiles.nickname,
      })
      .from(schema.memberProfiles)
      .where(inArray(schema.memberProfiles.id, riggerIds));
    for (const r of profiles) {
      if (r.nickname?.trim()) nicknameByRiggerId.set(r.id, r.nickname.trim());
    }
  }

  return approvals.map((a) => {
    const photo = firstByPostId.get(a.postId);
    const riggerId = photo?.riggerId ?? null;
    const status =
      a.status === "approved"
        ? "approved"
        : a.status === "rejected"
          ? "rejected"
          : "pending";
    return {
      approvalId: a.approvalId,
      postId: a.postId,
      createdAt: a.createdAt ?? new Date(),
      updatedAt: a.updatedAt ?? null,
      imagePath: photo?.imagePath ?? null,
      caption: photo?.caption ?? null,
      riggerId,
      riggerNickname: riggerId ? nicknameByRiggerId.get(riggerId) ?? null : null,
      status,
    };
  });
}

export async function getPendingApprovalsForBunny(
  bunnyUserId: string,
): Promise<PendingApprovalRow[]> {
  const approvals = await db
    .select({
      approvalId: schema.bunnyApprovals.id,
      postId: schema.bunnyApprovals.postId,
      createdAt: schema.bunnyApprovals.createdAt,
    })
    .from(schema.bunnyApprovals)
    .where(
      and(
        eq(schema.bunnyApprovals.bunnyUserId, bunnyUserId),
        eq(schema.bunnyApprovals.status, "pending"),
      ),
    )
    .orderBy(desc(schema.bunnyApprovals.createdAt));

  return mapApprovalsToRows(approvals);
}

/** 관리자: 모든 버니의 승인요청을 한 번에 조회 */
export async function getAllPendingApprovals(): Promise<PendingApprovalRow[]> {
  const approvals = await db
    .select({
      approvalId: schema.bunnyApprovals.id,
      postId: schema.bunnyApprovals.postId,
      createdAt: schema.bunnyApprovals.createdAt,
    })
    .from(schema.bunnyApprovals)
    .where(eq(schema.bunnyApprovals.status, "pending"))
    .orderBy(desc(schema.bunnyApprovals.createdAt));

  return mapApprovalsToRows(approvals);
}

/** 버니용: 승인/거절 포함 전체 목록 (확인용). 최신순. */
export async function getApprovalRequestsForBunny(
  bunnyUserId: string,
): Promise<BunnyApprovalListItem[]> {
  const approvals = await db
    .select({
      approvalId: schema.bunnyApprovals.id,
      postId: schema.bunnyApprovals.postId,
      createdAt: schema.bunnyApprovals.createdAt,
      updatedAt: schema.bunnyApprovals.updatedAt,
      status: schema.bunnyApprovals.status,
    })
    .from(schema.bunnyApprovals)
    .where(eq(schema.bunnyApprovals.bunnyUserId, bunnyUserId))
    .orderBy(desc(schema.bunnyApprovals.createdAt));

  return mapApprovalsToRowsWithStatus(approvals);
}

/** 관리자: 승인/거절 포함 전체 목록 (확인용). 최신순. */
export async function getAllApprovalRequests(): Promise<
  BunnyApprovalListItem[]
> {
  const approvals = await db
    .select({
      approvalId: schema.bunnyApprovals.id,
      postId: schema.bunnyApprovals.postId,
      createdAt: schema.bunnyApprovals.createdAt,
      updatedAt: schema.bunnyApprovals.updatedAt,
      status: schema.bunnyApprovals.status,
    })
    .from(schema.bunnyApprovals)
    .orderBy(desc(schema.bunnyApprovals.createdAt));

  return mapApprovalsToRowsWithStatus(approvals);
}

export async function approveBunnyPostRequest(
  approvalId: string,
  bunnyUserId: string,
): Promise<{ ok: true; riggerId?: string } | { ok: false; error: string }> {
  const row = await db
    .select({ postId: schema.bunnyApprovals.postId })
    .from(schema.bunnyApprovals)
    .where(
      and(
        eq(schema.bunnyApprovals.id, approvalId),
        eq(schema.bunnyApprovals.bunnyUserId, bunnyUserId),
      ),
    )
    .limit(1);

  if (!row[0]) {
    return { ok: false, error: "승인 요청을 찾을 수 없거나 권한이 없습니다." };
  }

  const postId = row[0].postId;

  await db
    .update(schema.bunnyApprovals)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(schema.bunnyApprovals.id, approvalId));

  const allForPost = await db
    .select({ status: schema.bunnyApprovals.status })
    .from(schema.bunnyApprovals)
    .where(eq(schema.bunnyApprovals.postId, postId));

  const allApproved = allForPost.every((r) => r.status === "approved");
  let riggerId: string | undefined;
  if (allApproved) {
    const targetVisibility =
      (await getVisibilityAfterApprovalByPostId(postId)) ?? "public";
    await setRiggerPostVisibilityByPostId(postId, targetVisibility);
    const photoRow = await db
      .select({ riggerId: schema.riggerPhotos.riggerId })
      .from(schema.riggerPhotos)
      .where(eq(schema.riggerPhotos.postId, postId))
      .limit(1);
    riggerId = photoRow[0]?.riggerId ?? undefined;
  }

  return { ok: true, riggerId };
}

/** 관리자: bunnyUserId 체크 없이 승인 */
export async function approveBunnyPostRequestAsAdmin(
  approvalId: string,
): Promise<{ ok: true; riggerId?: string } | { ok: false; error: string }> {
  const row = await db
    .select({ postId: schema.bunnyApprovals.postId })
    .from(schema.bunnyApprovals)
    .where(eq(schema.bunnyApprovals.id, approvalId))
    .limit(1);

  if (!row[0]) {
    return { ok: false, error: "승인 요청을 찾을 수 없습니다." };
  }

  const postId = row[0].postId;

  await db
    .update(schema.bunnyApprovals)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(schema.bunnyApprovals.id, approvalId));

  const allForPost = await db
    .select({ status: schema.bunnyApprovals.status })
    .from(schema.bunnyApprovals)
    .where(eq(schema.bunnyApprovals.postId, postId));

  const allApproved = allForPost.every((r) => r.status === "approved");
  let riggerId: string | undefined;
  if (allApproved) {
    const targetVisibility =
      (await getVisibilityAfterApprovalByPostId(postId)) ?? "public";
    await setRiggerPostVisibilityByPostId(postId, targetVisibility);
    const photoRow = await db
      .select({ riggerId: schema.riggerPhotos.riggerId })
      .from(schema.riggerPhotos)
      .where(eq(schema.riggerPhotos.postId, postId))
      .limit(1);
    riggerId = photoRow[0]?.riggerId ?? undefined;
  }

  return { ok: true, riggerId };
}

export async function rejectBunnyPostRequest(
  approvalId: string,
  bunnyUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await db
    .select({
      id: schema.bunnyApprovals.id,
      postId: schema.bunnyApprovals.postId,
    })
    .from(schema.bunnyApprovals)
    .where(
      and(
        eq(schema.bunnyApprovals.id, approvalId),
        eq(schema.bunnyApprovals.bunnyUserId, bunnyUserId),
      ),
    )
    .limit(1);

  if (!row[0]) {
    return { ok: false, error: "승인 요청을 찾을 수 없거나 권한이 없습니다." };
  }

  const { postId } = row[0];

  await db.transaction(async (tx) => {
    await tx
      .update(schema.bunnyApprovals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(schema.bunnyApprovals.id, approvalId));

    await tx
      .delete(schema.bunnyApprovals)
      .where(
        and(
          eq(schema.bunnyApprovals.postId, postId),
          ne(schema.bunnyApprovals.id, approvalId),
        ),
      );
  });

  return { ok: true };
}

/** 관리자: bunnyUserId 체크 없이 거절 */
export async function rejectBunnyPostRequestAsAdmin(
  approvalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await db
    .select({
      id: schema.bunnyApprovals.id,
      postId: schema.bunnyApprovals.postId,
    })
    .from(schema.bunnyApprovals)
    .where(eq(schema.bunnyApprovals.id, approvalId))
    .limit(1);

  if (!row[0]) {
    return { ok: false, error: "승인 요청을 찾을 수 없습니다." };
  }

  const { postId } = row[0];

  await db.transaction(async (tx) => {
    await tx
      .update(schema.bunnyApprovals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(schema.bunnyApprovals.id, approvalId));

    await tx
      .delete(schema.bunnyApprovals)
      .where(
        and(
          eq(schema.bunnyApprovals.postId, postId),
          ne(schema.bunnyApprovals.id, approvalId),
        ),
      );
  });

  return { ok: true };
}
