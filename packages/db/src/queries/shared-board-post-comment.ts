import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type SharedBoardCommentRow = {
  id: string;
  postId: string;
  parentId: string | null;
  authorUserId: string;
  authorNickname: string | null;
  body: string;
  deletedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type SharedBoardCommentWithReplies = SharedBoardCommentRow & { replies: SharedBoardCommentRow[] };

/**
 * 해당 글의 모든 댓글(top-level + 답글)을 한 번의 쿼리로 가져와 트리로 조합.
 * N+1 문제 해소: getSharedBoardRepliesByCommentId를 댓글마다 호출하는 대신 사용.
 */
export async function getAllSharedBoardCommentsWithRepliesByPostId(
  postId: string,
): Promise<SharedBoardCommentWithReplies[]> {
  const rows = await db
    .select({
      id: schema.sharedBoardPostComments.id,
      postId: schema.sharedBoardPostComments.postId,
      parentId: schema.sharedBoardPostComments.parentId,
      authorUserId: schema.sharedBoardPostComments.authorUserId,
      body: schema.sharedBoardPostComments.body,
      deletedAt: schema.sharedBoardPostComments.deletedAt,
      createdAt: schema.sharedBoardPostComments.createdAt,
      updatedAt: schema.sharedBoardPostComments.updatedAt,
      nickname: schema.memberProfiles.nickname,
    })
    .from(schema.sharedBoardPostComments)
    .leftJoin(
      schema.memberProfiles,
      eq(schema.sharedBoardPostComments.authorUserId, schema.memberProfiles.userId),
    )
    .where(eq(schema.sharedBoardPostComments.postId, postId))
    .orderBy(asc(schema.sharedBoardPostComments.createdAt));

  const all: SharedBoardCommentRow[] = rows.map((r) => ({
    id: r.id,
    postId: r.postId,
    parentId: r.parentId ?? null,
    authorUserId: r.authorUserId,
    authorNickname: r.nickname ?? null,
    body: r.body,
    deletedAt: r.deletedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
  }));

  const replyMap = new Map<string, SharedBoardCommentRow[]>();
  for (const c of all) {
    if (c.parentId) {
      const arr = replyMap.get(c.parentId) ?? [];
      arr.push(c);
      replyMap.set(c.parentId, arr);
    }
  }

  return all
    .filter((c) => c.parentId === null)
    .map((c) => ({ ...c, replies: replyMap.get(c.id) ?? [] }));
}

export async function getSharedBoardTopLevelCommentsByPostId(
  postId: string,
): Promise<SharedBoardCommentRow[]> {
  const rows = await db
    .select({
      id: schema.sharedBoardPostComments.id,
      postId: schema.sharedBoardPostComments.postId,
      parentId: schema.sharedBoardPostComments.parentId,
      authorUserId: schema.sharedBoardPostComments.authorUserId,
      body: schema.sharedBoardPostComments.body,
      deletedAt: schema.sharedBoardPostComments.deletedAt,
      createdAt: schema.sharedBoardPostComments.createdAt,
      updatedAt: schema.sharedBoardPostComments.updatedAt,
      nickname: schema.memberProfiles.nickname,
    })
    .from(schema.sharedBoardPostComments)
    .leftJoin(
      schema.memberProfiles,
      eq(
        schema.sharedBoardPostComments.authorUserId,
        schema.memberProfiles.userId,
      ),
    )
    .where(
      and(
        eq(schema.sharedBoardPostComments.postId, postId),
        isNull(schema.sharedBoardPostComments.parentId),
      ),
    )
    .orderBy(asc(schema.sharedBoardPostComments.createdAt));

  return rows.map((r) => ({
    id: r.id,
    postId: r.postId,
    parentId: r.parentId ?? null,
    authorUserId: r.authorUserId,
    authorNickname: r.nickname ?? null,
    body: r.body,
    deletedAt: r.deletedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
  }));
}

export async function getSharedBoardRepliesByCommentId(
  commentId: string,
): Promise<SharedBoardCommentRow[]> {
  const rows = await db
    .select({
      id: schema.sharedBoardPostComments.id,
      postId: schema.sharedBoardPostComments.postId,
      parentId: schema.sharedBoardPostComments.parentId,
      authorUserId: schema.sharedBoardPostComments.authorUserId,
      body: schema.sharedBoardPostComments.body,
      deletedAt: schema.sharedBoardPostComments.deletedAt,
      createdAt: schema.sharedBoardPostComments.createdAt,
      updatedAt: schema.sharedBoardPostComments.updatedAt,
      nickname: schema.memberProfiles.nickname,
    })
    .from(schema.sharedBoardPostComments)
    .leftJoin(
      schema.memberProfiles,
      eq(
        schema.sharedBoardPostComments.authorUserId,
        schema.memberProfiles.userId,
      ),
    )
    .where(eq(schema.sharedBoardPostComments.parentId, commentId))
    .orderBy(asc(schema.sharedBoardPostComments.createdAt));

  return rows.map((r) => ({
    id: r.id,
    postId: r.postId,
    parentId: r.parentId ?? null,
    authorUserId: r.authorUserId,
    authorNickname: r.nickname ?? null,
    body: r.body,
    deletedAt: r.deletedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
  }));
}

export async function createSharedBoardComment(
  postId: string,
  authorUserId: string,
  body: string,
  parentId?: string | null,
): Promise<{ ok: true; commentId: string } | { ok: false; error: string }> {
  const id = crypto.randomUUID();
  await db.insert(schema.sharedBoardPostComments).values({
    id,
    postId,
    parentId: parentId ?? null,
    authorUserId,
    body,
    updatedAt: new Date(),
  });
  return { ok: true, commentId: id };
}

export async function updateSharedBoardComment(
  commentId: string,
  userId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await db
    .update(schema.sharedBoardPostComments)
    .set({ body, updatedAt: new Date() })
    .where(
      and(
        eq(schema.sharedBoardPostComments.id, commentId),
        eq(schema.sharedBoardPostComments.authorUserId, userId),
      ),
    )
    .returning({ id: schema.sharedBoardPostComments.id });
  if (updated.length === 0) {
    return { ok: false, error: "댓글을 찾을 수 없거나 수정 권한이 없습니다." };
  }
  return { ok: true };
}

export async function deleteSharedBoardComment(
  commentId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await db
    .update(schema.sharedBoardPostComments)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.sharedBoardPostComments.id, commentId),
        eq(schema.sharedBoardPostComments.authorUserId, userId),
      ),
    )
    .returning({ id: schema.sharedBoardPostComments.id });
  if (updated.length === 0) {
    return { ok: false, error: "댓글을 찾을 수 없거나 삭제 권한이 없습니다." };
  }
  return { ok: true };
}

export async function getSharedBoardCommentById(
  commentId: string,
): Promise<{ parentId: string | null; postId: string } | null> {
  const rows = await db
    .select({
      parentId: schema.sharedBoardPostComments.parentId,
      postId: schema.sharedBoardPostComments.postId,
    })
    .from(schema.sharedBoardPostComments)
    .where(eq(schema.sharedBoardPostComments.id, commentId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return { parentId: r.parentId ?? null, postId: r.postId };
}
