import { and, asc, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../client/node";
import * as schema from "../schema";

const updaterProfile = alias(schema.memberProfiles, "updater_profile");

/** memberType이 operator이면 "운영진", 아니면 nickname 반환 */
function resolveAuthorNickname(
  memberType: string | null | undefined,
  nickname: string | null | undefined,
): string | null {
  if (memberType === "operator") return "운영진";
  return nickname ?? null;
}

export type SharedBoardRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type SharedBoardPostListItem = {
  id: string;
  boardId: string;
  postNumber: number;
  title: string;
  authorUserId: string;
  authorProfileId: string | null;
  authorMemberType: string | null;
  authorNickname: string | null;
  coverImageUrl: string | null;
  isPublished: boolean;
  scheduledPublishAt: Date | null;
  updatedByUserId: string | null;
  updatedByNickname: string | null;
  viewCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type SharedBoardPostListItemWithRecommend = SharedBoardPostListItem & {
  recommendCount: number;
};

/** Q&A 아코디언용: 목록 + 추천 수 + 본문 */
export type SharedBoardPostListItemWithRecommendAndBody =
  SharedBoardPostListItemWithRecommend & { body: string };

export type SharedBoardPostDetail = SharedBoardPostListItem & {
  body: string;
  boardSlug: string;
  boardName: string;
  sortOrder: number;
};

export async function getSharedBoards(): Promise<SharedBoardRow[]> {
  const rows = await db
    .select()
    .from(schema.sharedBoards)
    .orderBy(schema.sharedBoards.sortOrder, schema.sharedBoards.slug);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description ?? null,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getSharedBoardBySlug(
  slug: string,
): Promise<SharedBoardRow | null> {
  const rows = await db
    .select()
    .from(schema.sharedBoards)
    .where(eq(schema.sharedBoards.slug, slug))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description ?? null,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function getSharedBoardPosts(
  boardId: string,
  limit: number,
  offset: number,
  options?: { onlyPublished?: boolean },
): Promise<SharedBoardPostListItem[]> {
  const now = new Date();
  const where = options?.onlyPublished
    ? and(
        eq(schema.sharedBoardPosts.boardId, boardId),
        eq(schema.sharedBoardPosts.isPublished, true),
        or(
          isNull(schema.sharedBoardPosts.scheduledPublishAt),
          lte(schema.sharedBoardPosts.scheduledPublishAt, now),
        ),
      )
    : eq(schema.sharedBoardPosts.boardId, boardId);

  const rows = await db
    .select({
      id: schema.sharedBoardPosts.id,
      boardId: schema.sharedBoardPosts.boardId,
      postNumber: schema.sharedBoardPosts.postNumber,
      title: schema.sharedBoardPosts.title,
      authorUserId: schema.sharedBoardPosts.authorUserId,
      coverImageUrl: schema.sharedBoardPosts.coverImageUrl,
      isPublished: schema.sharedBoardPosts.isPublished,
      scheduledPublishAt: schema.sharedBoardPosts.scheduledPublishAt,
      updatedByUserId: schema.sharedBoardPosts.updatedByUserId,
      createdAt: schema.sharedBoardPosts.createdAt,
      updatedAt: schema.sharedBoardPosts.updatedAt,
      viewCount: schema.sharedBoardPosts.viewCount,
      nickname: schema.memberProfiles.nickname,
      memberType: schema.memberProfiles.memberType,
      profileId: schema.memberProfiles.id,
      updaterNickname: updaterProfile.nickname,
    })
    .from(schema.sharedBoardPosts)
    .leftJoin(
      schema.memberProfiles,
      eq(schema.sharedBoardPosts.authorUserId, schema.memberProfiles.userId),
    )
    .leftJoin(
      updaterProfile,
      eq(schema.sharedBoardPosts.updatedByUserId, updaterProfile.userId),
    )
    .where(where)
    .orderBy(
      asc(schema.sharedBoardPosts.sortOrder), // Q&A 등 게시물 정리 순서 우선
      desc(schema.sharedBoardPosts.createdAt),
    )
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    boardId: r.boardId,
    postNumber: r.postNumber,
    title: r.title,
    authorUserId: r.authorUserId,
    authorProfileId: r.profileId ?? null,
    authorMemberType: r.memberType ?? null,
    authorNickname: resolveAuthorNickname(r.memberType, r.nickname),
    coverImageUrl: r.coverImageUrl ?? null,
    isPublished: r.isPublished ?? true,
    scheduledPublishAt: r.scheduledPublishAt ?? null,
    updatedByUserId: r.updatedByUserId ?? null,
    updatedByNickname: r.updaterNickname ?? null,
    viewCount: r.viewCount ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
  }));
}

export async function getSharedBoardPostsWithRecommendCounts(
  boardId: string,
  limit: number,
  offset: number,
  options?: { onlyPublished?: boolean },
): Promise<SharedBoardPostListItemWithRecommend[]> {
  const recCountSubq = db
    .select({
      postId: schema.sharedBoardPostRecommends.postId,
      recommendCount: sql<number>`count(*)::int`.as("recommend_count"),
    })
    .from(schema.sharedBoardPostRecommends)
    .groupBy(schema.sharedBoardPostRecommends.postId)
    .as("rec_count");

  const now = new Date();
  const where = options?.onlyPublished
    ? and(
        eq(schema.sharedBoardPosts.boardId, boardId),
        eq(schema.sharedBoardPosts.isPublished, true),
        or(
          isNull(schema.sharedBoardPosts.scheduledPublishAt),
          lte(schema.sharedBoardPosts.scheduledPublishAt, now),
        ),
      )
    : eq(schema.sharedBoardPosts.boardId, boardId);

  const rows = await db
    .select({
      id: schema.sharedBoardPosts.id,
      boardId: schema.sharedBoardPosts.boardId,
      postNumber: schema.sharedBoardPosts.postNumber,
      title: schema.sharedBoardPosts.title,
      authorUserId: schema.sharedBoardPosts.authorUserId,
      coverImageUrl: schema.sharedBoardPosts.coverImageUrl,
      isPublished: schema.sharedBoardPosts.isPublished,
      scheduledPublishAt: schema.sharedBoardPosts.scheduledPublishAt,
      updatedByUserId: schema.sharedBoardPosts.updatedByUserId,
      createdAt: schema.sharedBoardPosts.createdAt,
      updatedAt: schema.sharedBoardPosts.updatedAt,
      viewCount: schema.sharedBoardPosts.viewCount,
      nickname: schema.memberProfiles.nickname,
      memberType: schema.memberProfiles.memberType,
      profileId: schema.memberProfiles.id,
      updaterNickname: updaterProfile.nickname,
      recommendCount: recCountSubq.recommendCount,
    })
    .from(schema.sharedBoardPosts)
    .leftJoin(
      schema.memberProfiles,
      eq(schema.sharedBoardPosts.authorUserId, schema.memberProfiles.userId),
    )
    .leftJoin(
      updaterProfile,
      eq(schema.sharedBoardPosts.updatedByUserId, updaterProfile.userId),
    )
    .leftJoin(
      recCountSubq,
      eq(schema.sharedBoardPosts.id, recCountSubq.postId),
    )
    .where(where)
    .orderBy(
      asc(schema.sharedBoardPosts.sortOrder), // Q&A 등 게시물 정리 순서 우선
      desc(schema.sharedBoardPosts.createdAt),
    )
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    boardId: r.boardId,
    postNumber: r.postNumber,
    title: r.title,
    authorUserId: r.authorUserId,
    authorProfileId: r.profileId ?? null,
    authorMemberType: r.memberType ?? null,
    authorNickname: resolveAuthorNickname(r.memberType, r.nickname),
    coverImageUrl: r.coverImageUrl ?? null,
    isPublished: r.isPublished ?? true,
    scheduledPublishAt: r.scheduledPublishAt ?? null,
    updatedByUserId: r.updatedByUserId ?? null,
    updatedByNickname: r.updaterNickname ?? null,
    viewCount: r.viewCount ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
    recommendCount: r.recommendCount ?? 0,
  }));
}

/** Q&A 아코디언용: 목록 + 추천 수 + 본문 (onlyPublished 권장) */
export async function getSharedBoardPostsWithBodies(
  boardId: string,
  limit: number,
  offset: number,
  options?: { onlyPublished?: boolean },
): Promise<SharedBoardPostListItemWithRecommendAndBody[]> {
  const recCountSubq = db
    .select({
      postId: schema.sharedBoardPostRecommends.postId,
      recommendCount: sql<number>`count(*)::int`.as("recommend_count"),
    })
    .from(schema.sharedBoardPostRecommends)
    .groupBy(schema.sharedBoardPostRecommends.postId)
    .as("rec_count");

  const now = new Date();
  const where = options?.onlyPublished
    ? and(
        eq(schema.sharedBoardPosts.boardId, boardId),
        eq(schema.sharedBoardPosts.isPublished, true),
        or(
          isNull(schema.sharedBoardPosts.scheduledPublishAt),
          lte(schema.sharedBoardPosts.scheduledPublishAt, now),
        ),
      )
    : eq(schema.sharedBoardPosts.boardId, boardId);

  const rows = await db
    .select({
      id: schema.sharedBoardPosts.id,
      boardId: schema.sharedBoardPosts.boardId,
      postNumber: schema.sharedBoardPosts.postNumber,
      title: schema.sharedBoardPosts.title,
      body: schema.sharedBoardPosts.body,
      authorUserId: schema.sharedBoardPosts.authorUserId,
      coverImageUrl: schema.sharedBoardPosts.coverImageUrl,
      isPublished: schema.sharedBoardPosts.isPublished,
      scheduledPublishAt: schema.sharedBoardPosts.scheduledPublishAt,
      updatedByUserId: schema.sharedBoardPosts.updatedByUserId,
      createdAt: schema.sharedBoardPosts.createdAt,
      updatedAt: schema.sharedBoardPosts.updatedAt,
      viewCount: schema.sharedBoardPosts.viewCount,
      nickname: schema.memberProfiles.nickname,
      memberType: schema.memberProfiles.memberType,
      profileId: schema.memberProfiles.id,
      updaterNickname: updaterProfile.nickname,
      recommendCount: recCountSubq.recommendCount,
    })
    .from(schema.sharedBoardPosts)
    .leftJoin(
      schema.memberProfiles,
      eq(schema.sharedBoardPosts.authorUserId, schema.memberProfiles.userId),
    )
    .leftJoin(
      updaterProfile,
      eq(schema.sharedBoardPosts.updatedByUserId, updaterProfile.userId),
    )
    .leftJoin(
      recCountSubq,
      eq(schema.sharedBoardPosts.id, recCountSubq.postId),
    )
    .where(where)
    .orderBy(
      asc(schema.sharedBoardPosts.sortOrder), // Q&A 등 게시물 정리 순서 우선
      desc(schema.sharedBoardPosts.createdAt),
    )
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    boardId: r.boardId,
    postNumber: r.postNumber,
    title: r.title,
    body: r.body,
    authorUserId: r.authorUserId,
    authorProfileId: r.profileId ?? null,
    authorMemberType: r.memberType ?? null,
    authorNickname: resolveAuthorNickname(r.memberType, r.nickname),
    coverImageUrl: r.coverImageUrl ?? null,
    isPublished: r.isPublished ?? true,
    scheduledPublishAt: r.scheduledPublishAt ?? null,
    updatedByUserId: r.updatedByUserId ?? null,
    updatedByNickname: r.updaterNickname ?? null,
    viewCount: r.viewCount ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
    recommendCount: r.recommendCount ?? 0,
  }));
}

export async function getSharedBoardPostCount(
  boardId: string,
  options?: { onlyPublished?: boolean },
): Promise<number> {
  const now = new Date();
  const where = options?.onlyPublished
    ? and(
        eq(schema.sharedBoardPosts.boardId, boardId),
        eq(schema.sharedBoardPosts.isPublished, true),
        or(
          isNull(schema.sharedBoardPosts.scheduledPublishAt),
          lte(schema.sharedBoardPosts.scheduledPublishAt, now),
        ),
      )
    : eq(schema.sharedBoardPosts.boardId, boardId);
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.sharedBoardPosts)
    .where(where);
  return result[0]?.count ?? 0;
}

export async function getSharedBoardPostById(
  postId: string,
): Promise<SharedBoardPostDetail | null> {
  const rows = await db
    .select({
      id: schema.sharedBoardPosts.id,
      boardId: schema.sharedBoardPosts.boardId,
      postNumber: schema.sharedBoardPosts.postNumber,
      title: schema.sharedBoardPosts.title,
      body: schema.sharedBoardPosts.body,
      authorUserId: schema.sharedBoardPosts.authorUserId,
      coverImageUrl: schema.sharedBoardPosts.coverImageUrl,
      isPublished: schema.sharedBoardPosts.isPublished,
      scheduledPublishAt: schema.sharedBoardPosts.scheduledPublishAt,
      sortOrder: schema.sharedBoardPosts.sortOrder,
      updatedByUserId: schema.sharedBoardPosts.updatedByUserId,
      createdAt: schema.sharedBoardPosts.createdAt,
      updatedAt: schema.sharedBoardPosts.updatedAt,
      boardSlug: schema.sharedBoards.slug,
      boardName: schema.sharedBoards.name,
      viewCount: schema.sharedBoardPosts.viewCount,
      nickname: schema.memberProfiles.nickname,
      memberType: schema.memberProfiles.memberType,
      profileId: schema.memberProfiles.id,
      updaterNickname: updaterProfile.nickname,
    })
    .from(schema.sharedBoardPosts)
    .innerJoin(
      schema.sharedBoards,
      eq(schema.sharedBoardPosts.boardId, schema.sharedBoards.id),
    )
    .leftJoin(
      schema.memberProfiles,
      eq(schema.sharedBoardPosts.authorUserId, schema.memberProfiles.userId),
    )
    .leftJoin(
      updaterProfile,
      eq(schema.sharedBoardPosts.updatedByUserId, updaterProfile.userId),
    )
    .where(eq(schema.sharedBoardPosts.id, postId))
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    boardId: r.boardId,
    postNumber: r.postNumber,
    title: r.title,
    body: r.body,
    authorUserId: r.authorUserId,
    authorProfileId: r.profileId ?? null,
    authorMemberType: r.memberType ?? null,
    isPublished: r.isPublished ?? true,
    authorNickname: resolveAuthorNickname(r.memberType, r.nickname),
    coverImageUrl: r.coverImageUrl ?? null,
    scheduledPublishAt: r.scheduledPublishAt ?? null,
    updatedByUserId: r.updatedByUserId ?? null,
    updatedByNickname: r.updaterNickname ?? null,
    viewCount: r.viewCount ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
    boardSlug: r.boardSlug,
    boardName: r.boardName,
    sortOrder: r.sortOrder ?? 0,
  };
}

export async function createSharedBoardPost(
  boardId: string,
  authorUserId: string,
  title: string,
  body: string,
  coverImageUrl?: string | null,
  isPublished: boolean = true,
  scheduledPublishAt?: Date | null,
  sortOrder: number = 0,
): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const nextNumRows = await db.execute<{ next: number }>(sql`
    SELECT COALESCE(MAX(post_number), 0) + 1 AS next
    FROM shared_board_posts WHERE board_id = ${boardId}
  `);
  const postNumber =
    Array.isArray(nextNumRows) && nextNumRows[0] ? nextNumRows[0].next : 1;

  const id = crypto.randomUUID();
  await db.insert(schema.sharedBoardPosts).values({
    id,
    boardId,
    authorUserId,
    postNumber,
    title,
    body,
    coverImageUrl: coverImageUrl ?? null,
    isPublished,
    scheduledPublishAt: scheduledPublishAt ?? null,
    sortOrder,
    updatedAt: new Date(),
  });
  return { ok: true, postId: id };
}

export async function updateSharedBoardPost(
  postId: string,
  userId: string,
  data: { title: string; body: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await db
    .update(schema.sharedBoardPosts)
    .set({
      title: data.title,
      body: data.body,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.sharedBoardPosts.id, postId),
        eq(schema.sharedBoardPosts.authorUserId, userId),
      ),
    )
    .returning({ id: schema.sharedBoardPosts.id });
  if (updated.length === 0) {
    return { ok: false, error: "글을 찾을 수 없거나 수정 권한이 없습니다." };
  }
  return { ok: true };
}

export async function deleteSharedBoardPost(
  postId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deleted = await db
    .delete(schema.sharedBoardPosts)
    .where(
      and(
        eq(schema.sharedBoardPosts.id, postId),
        eq(schema.sharedBoardPosts.authorUserId, userId),
      ),
    )
    .returning({ id: schema.sharedBoardPosts.id });
  if (deleted.length === 0) {
    return { ok: false, error: "글을 찾을 수 없거나 삭제 권한이 없습니다." };
  }
  return { ok: true };
}

export async function updateSharedBoardPostByAdmin(
  postId: string,
  data: {
    title: string;
    body: string;
    coverImageUrl?: string | null;
    isPublished?: boolean;
    scheduledPublishAt?: Date | null;
    sortOrder?: number;
    updatedByUserId?: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await db
    .update(schema.sharedBoardPosts)
    .set({
      title: data.title,
      body: data.body,
      ...(data.coverImageUrl !== undefined && {
        coverImageUrl: data.coverImageUrl ?? null,
      }),
      ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      ...(data.scheduledPublishAt !== undefined && {
        scheduledPublishAt: data.scheduledPublishAt ?? null,
      }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.updatedByUserId !== undefined && {
        updatedByUserId: data.updatedByUserId ?? null,
      }),
      updatedAt: new Date(),
    })
    .where(eq(schema.sharedBoardPosts.id, postId))
    .returning({ id: schema.sharedBoardPosts.id });
  if (updated.length === 0) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  return { ok: true };
}

export async function deleteSharedBoardPostByAdmin(
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deleted = await db
    .delete(schema.sharedBoardPosts)
    .where(eq(schema.sharedBoardPosts.id, postId))
    .returning({ id: schema.sharedBoardPosts.id });
  if (deleted.length === 0) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  return { ok: true };
}

export async function getSharedBoardRecommendCount(postId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.sharedBoardPostRecommends)
    .where(eq(schema.sharedBoardPostRecommends.postId, postId));
  return result[0]?.count ?? 0;
}

export async function getSharedBoardRecommendCountsByPostIds(
  postIds: string[],
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const rows = await db
    .select({
      postId: schema.sharedBoardPostRecommends.postId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(schema.sharedBoardPostRecommends)
    .where(inArray(schema.sharedBoardPostRecommends.postId, postIds))
    .groupBy(schema.sharedBoardPostRecommends.postId);
  const out: Record<string, number> = {};
  for (const id of postIds) out[id] = 0;
  for (const r of rows) out[r.postId] = r.count;
  return out;
}

export async function hasUserRecommendedSharedBoard(
  postId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ postId: schema.sharedBoardPostRecommends.postId })
    .from(schema.sharedBoardPostRecommends)
    .where(
      and(
        eq(schema.sharedBoardPostRecommends.postId, postId),
        eq(schema.sharedBoardPostRecommends.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function addSharedBoardRecommend(
  postId: string,
  userId: string,
): Promise<{ ok: true; added: boolean } | { ok: false; error: string }> {
  try {
    await db.insert(schema.sharedBoardPostRecommends).values({
      postId,
      userId,
    });
    return { ok: true, added: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return { ok: true, added: false };
    }
    return { ok: false, error: "추천 처리에 실패했습니다." };
  }
}

export async function removeSharedBoardRecommend(
  postId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await db
    .delete(schema.sharedBoardPostRecommends)
    .where(
      and(
        eq(schema.sharedBoardPostRecommends.postId, postId),
        eq(schema.sharedBoardPostRecommends.userId, userId),
      ),
    )
    .returning({ postId: schema.sharedBoardPostRecommends.postId });
  return { ok: true };
}

export async function incrementSharedBoardPostViewCount(
  postId: string,
): Promise<void> {
  await db
    .update(schema.sharedBoardPosts)
    .set({ viewCount: sql`${schema.sharedBoardPosts.viewCount} + 1` })
    .where(eq(schema.sharedBoardPosts.id, postId));
}
