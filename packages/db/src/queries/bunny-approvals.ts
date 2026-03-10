import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";
import { setRiggerPostVisibilityByPostId } from "./rigger-photos";

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

async function mapApprovalsToRows(
  approvals: { approvalId: string; postId: string; createdAt: Date | null }[],
): Promise<PendingApprovalRow[]> {
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

  return approvals.map((a) => {
    const photo = firstByPostId.get(a.postId);
    return {
      approvalId: a.approvalId,
      postId: a.postId,
      createdAt: a.createdAt ?? new Date(),
      imagePath: photo?.imagePath ?? null,
      caption: photo?.caption ?? null,
      riggerId: photo?.riggerId ?? null,
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
    await setRiggerPostVisibilityByPostId(postId, "public");
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
    await setRiggerPostVisibilityByPostId(postId, "public");
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
