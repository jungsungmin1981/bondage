import { and, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../client/node";
import * as schema from "../schema";

const updaterProfile = alias(schema.memberProfiles, "updater_profile");

export type BunnyBoardRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type BunnyBoardPostListItem = {
  id: string;
  boardId: string;
  postNumber: number;
  title: string;
  authorUserId: string;
  authorNickname: string | null;
  coverImageUrl: string | null;
  isPublished: boolean;
  scheduledPublishAt: Date | null;
  updatedByUserId: string | null;
  updatedByNickname: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

/** 목록 항목 + 추천 수 (자유 게시판 목록 최적화용) */
export type BunnyBoardPostListItemWithRecommend = BunnyBoardPostListItem & {
  recommendCount: number;
};

export type BunnyBoardPostDetail = BunnyBoardPostListItem & {
  body: string;
  boardSlug: string;
  boardName: string;
};

/** 진입 페이지용: 정렬된 게시판 목록 */
export async function getBunnyBoards(): Promise<BunnyBoardRow[]> {
  const rows = await db
    .select()
    .from(schema.bunnyBoards)
    .orderBy(schema.bunnyBoards.sortOrder, schema.bunnyBoards.slug);
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

/** slug로 게시판 한 건 조회 */
export async function getBunnyBoardBySlug(
  slug: string,
): Promise<BunnyBoardRow | null> {
  const rows = await db
    .select()
    .from(schema.bunnyBoards)
    .where(eq(schema.bunnyBoards.slug, slug))
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

/** 게시판별 글 목록 (최신순), 작성자 닉네임 포함. onlyPublished true면 공개된 글만(예약 시각 반영). */
export async function getBunnyBoardPosts(
  boardId: string,
  limit: number,
  offset: number,
  options?: { onlyPublished?: boolean },
): Promise<BunnyBoardPostListItem[]> {
  const now = new Date();
  const where = options?.onlyPublished
    ? and(
        eq(schema.bunnyBoardPosts.boardId, boardId),
        eq(schema.bunnyBoardPosts.isPublished, true),
        or(
          isNull(schema.bunnyBoardPosts.scheduledPublishAt),
          lte(schema.bunnyBoardPosts.scheduledPublishAt, now),
        ),
      )
    : eq(schema.bunnyBoardPosts.boardId, boardId);

  const rows = await db
    .select({
      id: schema.bunnyBoardPosts.id,
      boardId: schema.bunnyBoardPosts.boardId,
      postNumber: schema.bunnyBoardPosts.postNumber,
      title: schema.bunnyBoardPosts.title,
      authorUserId: schema.bunnyBoardPosts.authorUserId,
      coverImageUrl: schema.bunnyBoardPosts.coverImageUrl,
      isPublished: schema.bunnyBoardPosts.isPublished,
      scheduledPublishAt: schema.bunnyBoardPosts.scheduledPublishAt,
      updatedByUserId: schema.bunnyBoardPosts.updatedByUserId,
      createdAt: schema.bunnyBoardPosts.createdAt,
      updatedAt: schema.bunnyBoardPosts.updatedAt,
      nickname: schema.memberProfiles.nickname,
      updaterNickname: updaterProfile.nickname,
    })
    .from(schema.bunnyBoardPosts)
    .leftJoin(
      schema.memberProfiles,
      eq(schema.bunnyBoardPosts.authorUserId, schema.memberProfiles.userId),
    )
    .leftJoin(
      updaterProfile,
      eq(schema.bunnyBoardPosts.updatedByUserId, updaterProfile.userId),
    )
    .where(where)
    .orderBy(desc(schema.bunnyBoardPosts.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    boardId: r.boardId,
    postNumber: r.postNumber,
    title: r.title,
    authorUserId: r.authorUserId,
    authorNickname: r.nickname ?? null,
    coverImageUrl: r.coverImageUrl ?? null,
    isPublished: r.isPublished ?? true,
    scheduledPublishAt: r.scheduledPublishAt ?? null,
    updatedByUserId: r.updatedByUserId ?? null,
    updatedByNickname: r.updaterNickname ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
  }));
}

/** 게시판별 글 목록 + 추천 수 (한 번에 조회, 자유 게시판 목록용). onlyPublished true면 공개된 글만(예약 시각 반영). */
export async function getBunnyBoardPostsWithRecommendCounts(
  boardId: string,
  limit: number,
  offset: number,
  options?: { onlyPublished?: boolean },
): Promise<BunnyBoardPostListItemWithRecommend[]> {
  const recCountSubq = db
    .select({
      postId: schema.bunnyBoardPostRecommends.postId,
      recommendCount: sql<number>`count(*)::int`.as("recommend_count"),
    })
    .from(schema.bunnyBoardPostRecommends)
    .groupBy(schema.bunnyBoardPostRecommends.postId)
    .as("rec_count");

  const now = new Date();
  const where = options?.onlyPublished
    ? and(
        eq(schema.bunnyBoardPosts.boardId, boardId),
        eq(schema.bunnyBoardPosts.isPublished, true),
        or(
          isNull(schema.bunnyBoardPosts.scheduledPublishAt),
          lte(schema.bunnyBoardPosts.scheduledPublishAt, now),
        ),
      )
    : eq(schema.bunnyBoardPosts.boardId, boardId);

  const rows = await db
    .select({
      id: schema.bunnyBoardPosts.id,
      boardId: schema.bunnyBoardPosts.boardId,
      postNumber: schema.bunnyBoardPosts.postNumber,
      title: schema.bunnyBoardPosts.title,
      authorUserId: schema.bunnyBoardPosts.authorUserId,
      coverImageUrl: schema.bunnyBoardPosts.coverImageUrl,
      isPublished: schema.bunnyBoardPosts.isPublished,
      scheduledPublishAt: schema.bunnyBoardPosts.scheduledPublishAt,
      updatedByUserId: schema.bunnyBoardPosts.updatedByUserId,
      createdAt: schema.bunnyBoardPosts.createdAt,
      updatedAt: schema.bunnyBoardPosts.updatedAt,
      nickname: schema.memberProfiles.nickname,
      updaterNickname: updaterProfile.nickname,
      recommendCount: recCountSubq.recommendCount,
    })
    .from(schema.bunnyBoardPosts)
    .leftJoin(
      schema.memberProfiles,
      eq(schema.bunnyBoardPosts.authorUserId, schema.memberProfiles.userId),
    )
    .leftJoin(
      updaterProfile,
      eq(schema.bunnyBoardPosts.updatedByUserId, updaterProfile.userId),
    )
    .leftJoin(
      recCountSubq,
      eq(schema.bunnyBoardPosts.id, recCountSubq.postId),
    )
    .where(where)
    .orderBy(desc(schema.bunnyBoardPosts.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    boardId: r.boardId,
    postNumber: r.postNumber,
    title: r.title,
    authorUserId: r.authorUserId,
    authorNickname: r.nickname ?? null,
    coverImageUrl: r.coverImageUrl ?? null,
    isPublished: r.isPublished ?? true,
    scheduledPublishAt: r.scheduledPublishAt ?? null,
    updatedByUserId: r.updatedByUserId ?? null,
    updatedByNickname: r.updaterNickname ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
    recommendCount: r.recommendCount ?? 0,
  }));
}

/** 게시판 글 개수. onlyPublished true면 공개된 글만(예약 시각 반영). */
export async function getBunnyBoardPostCount(
  boardId: string,
  options?: { onlyPublished?: boolean },
): Promise<number> {
  const now = new Date();
  const where = options?.onlyPublished
    ? and(
        eq(schema.bunnyBoardPosts.boardId, boardId),
        eq(schema.bunnyBoardPosts.isPublished, true),
        or(
          isNull(schema.bunnyBoardPosts.scheduledPublishAt),
          lte(schema.bunnyBoardPosts.scheduledPublishAt, now),
        ),
      )
    : eq(schema.bunnyBoardPosts.boardId, boardId);
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.bunnyBoardPosts)
    .where(where);
  return result[0]?.count ?? 0;
}

/** 글 상세 조회 (게시판 정보 + 작성자 닉네임 포함) */
export async function getBunnyBoardPostById(
  postId: string,
): Promise<BunnyBoardPostDetail | null> {
  const rows = await db
    .select({
      id: schema.bunnyBoardPosts.id,
      boardId: schema.bunnyBoardPosts.boardId,
      postNumber: schema.bunnyBoardPosts.postNumber,
      title: schema.bunnyBoardPosts.title,
      body: schema.bunnyBoardPosts.body,
      authorUserId: schema.bunnyBoardPosts.authorUserId,
      coverImageUrl: schema.bunnyBoardPosts.coverImageUrl,
      isPublished: schema.bunnyBoardPosts.isPublished,
      scheduledPublishAt: schema.bunnyBoardPosts.scheduledPublishAt,
      updatedByUserId: schema.bunnyBoardPosts.updatedByUserId,
      createdAt: schema.bunnyBoardPosts.createdAt,
      updatedAt: schema.bunnyBoardPosts.updatedAt,
      boardSlug: schema.bunnyBoards.slug,
      boardName: schema.bunnyBoards.name,
      nickname: schema.memberProfiles.nickname,
      updaterNickname: updaterProfile.nickname,
    })
    .from(schema.bunnyBoardPosts)
    .innerJoin(
      schema.bunnyBoards,
      eq(schema.bunnyBoardPosts.boardId, schema.bunnyBoards.id),
    )
    .leftJoin(
      schema.memberProfiles,
      eq(schema.bunnyBoardPosts.authorUserId, schema.memberProfiles.userId),
    )
    .leftJoin(
      updaterProfile,
      eq(schema.bunnyBoardPosts.updatedByUserId, updaterProfile.userId),
    )
    .where(eq(schema.bunnyBoardPosts.id, postId))
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
    isPublished: r.isPublished ?? true,
    authorNickname: r.nickname ?? null,
    coverImageUrl: r.coverImageUrl ?? null,
    scheduledPublishAt: r.scheduledPublishAt ?? null,
    updatedByUserId: r.updatedByUserId ?? null,
    updatedByNickname: r.updaterNickname ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
    boardSlug: r.boardSlug,
    boardName: r.boardName,
  };
}

/** 글 작성. 반환: { ok: true, postId } | { ok: false, error } */
export async function createBunnyBoardPost(
  boardId: string,
  authorUserId: string,
  title: string,
  body: string,
  coverImageUrl?: string | null,
  isPublished: boolean = true,
  scheduledPublishAt?: Date | null,
): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const nextNumRows = await db.execute<{ next: number }>(sql`
    SELECT COALESCE(MAX(post_number), 0) + 1 AS next
    FROM bunny_board_posts WHERE board_id = ${boardId}
  `);
  const postNumber = Array.isArray(nextNumRows) && nextNumRows[0] ? nextNumRows[0].next : 1;

  const id = crypto.randomUUID();
  await db.insert(schema.bunnyBoardPosts).values({
    id,
    boardId,
    authorUserId,
    postNumber,
    title,
    body,
    coverImageUrl: coverImageUrl ?? null,
    isPublished,
    scheduledPublishAt: scheduledPublishAt ?? null,
    updatedAt: new Date(),
  });
  return { ok: true, postId: id };
}

/** 글 수정. 본인만 가능. */
export async function updateBunnyBoardPost(
  postId: string,
  userId: string,
  data: { title: string; body: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await db
    .update(schema.bunnyBoardPosts)
    .set({
      title: data.title,
      body: data.body,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.bunnyBoardPosts.id, postId),
        eq(schema.bunnyBoardPosts.authorUserId, userId),
      ),
    )
    .returning({ id: schema.bunnyBoardPosts.id });
  if (updated.length === 0) {
    return { ok: false, error: "글을 찾을 수 없거나 수정 권한이 없습니다." };
  }
  return { ok: true };
}

/** 글 삭제. 본인만 가능. */
export async function deleteBunnyBoardPost(
  postId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deleted = await db
    .delete(schema.bunnyBoardPosts)
    .where(
      and(
        eq(schema.bunnyBoardPosts.id, postId),
        eq(schema.bunnyBoardPosts.authorUserId, userId),
      ),
    )
    .returning({ id: schema.bunnyBoardPosts.id });
  if (deleted.length === 0) {
    return { ok: false, error: "글을 찾을 수 없거나 삭제 권한이 없습니다." };
  }
  return { ok: true };
}

/** 관리자용: 글 수정 (작성자 무관). 공지 등 coverImageUrl, isPublished, scheduledPublishAt 변경 시 사용. */
export async function updateBunnyBoardPostByAdmin(
  postId: string,
  data: {
    title: string;
    body: string;
    coverImageUrl?: string | null;
    isPublished?: boolean;
    scheduledPublishAt?: Date | null;
    updatedByUserId?: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await db
    .update(schema.bunnyBoardPosts)
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
      ...(data.updatedByUserId !== undefined && {
        updatedByUserId: data.updatedByUserId ?? null,
      }),
      updatedAt: new Date(),
    })
    .where(eq(schema.bunnyBoardPosts.id, postId))
    .returning({ id: schema.bunnyBoardPosts.id });
  if (updated.length === 0) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  return { ok: true };
}

/** 관리자용: 글 삭제 (작성자 무관). */
export async function deleteBunnyBoardPostByAdmin(
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deleted = await db
    .delete(schema.bunnyBoardPosts)
    .where(eq(schema.bunnyBoardPosts.id, postId))
    .returning({ id: schema.bunnyBoardPosts.id });
  if (deleted.length === 0) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  return { ok: true };
}

/** 글 하나의 추천 수 */
export async function getRecommendCount(postId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.bunnyBoardPostRecommends)
    .where(eq(schema.bunnyBoardPostRecommends.postId, postId));
  return result[0]?.count ?? 0;
}

/** 여러 글의 추천 수 (postId -> count) */
export async function getRecommendCountsByPostIds(
  postIds: string[],
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const rows = await db
    .select({
      postId: schema.bunnyBoardPostRecommends.postId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(schema.bunnyBoardPostRecommends)
    .where(inArray(schema.bunnyBoardPostRecommends.postId, postIds))
    .groupBy(schema.bunnyBoardPostRecommends.postId);
  const out: Record<string, number> = {};
  for (const id of postIds) out[id] = 0;
  for (const r of rows) out[r.postId] = r.count;
  return out;
}

/** 해당 유저가 이 글을 추천했는지 */
export async function hasUserRecommended(
  postId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ postId: schema.bunnyBoardPostRecommends.postId })
    .from(schema.bunnyBoardPostRecommends)
    .where(
      and(
        eq(schema.bunnyBoardPostRecommends.postId, postId),
        eq(schema.bunnyBoardPostRecommends.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** 추천 추가 (이미 있으면 무시). 반환: 추가됨 여부 */
export async function addRecommend(
  postId: string,
  userId: string,
): Promise<{ ok: true; added: boolean } | { ok: false; error: string }> {
  try {
    await db.insert(schema.bunnyBoardPostRecommends).values({
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

/** 추천 취소 */
export async function removeRecommend(
  postId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deleted = await db
    .delete(schema.bunnyBoardPostRecommends)
    .where(
      and(
        eq(schema.bunnyBoardPostRecommends.postId, postId),
        eq(schema.bunnyBoardPostRecommends.userId, userId),
      ),
    )
    .returning({ postId: schema.bunnyBoardPostRecommends.postId });
  return { ok: true };
}
