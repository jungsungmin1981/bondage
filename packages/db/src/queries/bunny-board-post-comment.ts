import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type CommentRow = {
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

export type CommentWithReplies = CommentRow & { replies: CommentRow[] };

/**
 * 해당 글의 모든 댓글(top-level + 답글)을 한 번의 쿼리로 가져와 트리로 조합.
 * N+1 문제 해소: getRepliesByCommentId를 댓글마다 호출하는 대신 사용.
 */
export async function getAllCommentsWithRepliesByPostId(
  postId: string,
): Promise<CommentWithReplies[]> {
  const rows = await db
    .select({
      id: schema.bunnyBoardPostComments.id,
      postId: schema.bunnyBoardPostComments.postId,
      parentId: schema.bunnyBoardPostComments.parentId,
      authorUserId: schema.bunnyBoardPostComments.authorUserId,
      body: schema.bunnyBoardPostComments.body,
      deletedAt: schema.bunnyBoardPostComments.deletedAt,
      createdAt: schema.bunnyBoardPostComments.createdAt,
      updatedAt: schema.bunnyBoardPostComments.updatedAt,
      nickname: schema.memberProfiles.nickname,
    })
    .from(schema.bunnyBoardPostComments)
    .leftJoin(
      schema.memberProfiles,
      eq(schema.bunnyBoardPostComments.authorUserId, schema.memberProfiles.userId),
    )
    .where(eq(schema.bunnyBoardPostComments.postId, postId))
    .orderBy(asc(schema.bunnyBoardPostComments.createdAt));

  const all: CommentRow[] = rows.map((r) => ({
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

  const replyMap = new Map<string, CommentRow[]>();
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

/** 해당 글의 댓글만 조회 (parent_id IS NULL), 작성일 오름차순 */
export async function getTopLevelCommentsByPostId(
  postId: string,
): Promise<CommentRow[]> {
  const rows = await db
    .select({
      id: schema.bunnyBoardPostComments.id,
      postId: schema.bunnyBoardPostComments.postId,
      parentId: schema.bunnyBoardPostComments.parentId,
      authorUserId: schema.bunnyBoardPostComments.authorUserId,
      body: schema.bunnyBoardPostComments.body,
      deletedAt: schema.bunnyBoardPostComments.deletedAt,
      createdAt: schema.bunnyBoardPostComments.createdAt,
      updatedAt: schema.bunnyBoardPostComments.updatedAt,
      nickname: schema.memberProfiles.nickname,
    })
    .from(schema.bunnyBoardPostComments)
    .leftJoin(
      schema.memberProfiles,
      eq(
        schema.bunnyBoardPostComments.authorUserId,
        schema.memberProfiles.userId,
      ),
    )
    .where(
      and(
        eq(schema.bunnyBoardPostComments.postId, postId),
        isNull(schema.bunnyBoardPostComments.parentId),
      ),
    )
    .orderBy(asc(schema.bunnyBoardPostComments.createdAt));

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

/** 해당 댓글의 답글 목록, 작성일 오름차순 */
export async function getRepliesByCommentId(
  commentId: string,
): Promise<CommentRow[]> {
  const rows = await db
    .select({
      id: schema.bunnyBoardPostComments.id,
      postId: schema.bunnyBoardPostComments.postId,
      parentId: schema.bunnyBoardPostComments.parentId,
      authorUserId: schema.bunnyBoardPostComments.authorUserId,
      body: schema.bunnyBoardPostComments.body,
      deletedAt: schema.bunnyBoardPostComments.deletedAt,
      createdAt: schema.bunnyBoardPostComments.createdAt,
      updatedAt: schema.bunnyBoardPostComments.updatedAt,
      nickname: schema.memberProfiles.nickname,
    })
    .from(schema.bunnyBoardPostComments)
    .leftJoin(
      schema.memberProfiles,
      eq(
        schema.bunnyBoardPostComments.authorUserId,
        schema.memberProfiles.userId,
      ),
    )
    .where(eq(schema.bunnyBoardPostComments.parentId, commentId))
    .orderBy(asc(schema.bunnyBoardPostComments.createdAt));

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

/** 댓글 또는 답글 작성. parentId 있으면 답글(부모가 top-level인지 호출 전 검증). */
export async function createComment(
  postId: string,
  authorUserId: string,
  body: string,
  parentId?: string | null,
): Promise<{ ok: true; commentId: string } | { ok: false; error: string }> {
  const id = crypto.randomUUID();
  await db.insert(schema.bunnyBoardPostComments).values({
    id,
    postId,
    parentId: parentId ?? null,
    authorUserId,
    body,
    updatedAt: new Date(),
  });
  return { ok: true, commentId: id };
}

/** 댓글/답글 수정. 본인만. */
export async function updateComment(
  commentId: string,
  userId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await db
    .update(schema.bunnyBoardPostComments)
    .set({ body, updatedAt: new Date() })
    .where(
      and(
        eq(schema.bunnyBoardPostComments.id, commentId),
        eq(schema.bunnyBoardPostComments.authorUserId, userId),
      ),
    )
    .returning({ id: schema.bunnyBoardPostComments.id });
  if (updated.length === 0) {
    return { ok: false, error: "댓글을 찾을 수 없거나 수정 권한이 없습니다." };
  }
  return { ok: true };
}

/** 댓글/답글 삭제. 본인만. soft delete(deleted_at 설정). */
export async function deleteComment(
  commentId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await db
    .update(schema.bunnyBoardPostComments)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.bunnyBoardPostComments.id, commentId),
        eq(schema.bunnyBoardPostComments.authorUserId, userId),
      ),
    )
    .returning({ id: schema.bunnyBoardPostComments.id });
  if (updated.length === 0) {
    return { ok: false, error: "댓글을 찾을 수 없거나 삭제 권한이 없습니다." };
  }
  return { ok: true };
}

/** 부모 댓글이 top-level인지 확인 (parent_id IS NULL) */
export async function isTopLevelComment(
  commentId: string,
): Promise<boolean> {
  const rows = await db
    .select({ parentId: schema.bunnyBoardPostComments.parentId })
    .from(schema.bunnyBoardPostComments)
    .where(eq(schema.bunnyBoardPostComments.id, commentId))
    .limit(1);
  const r = rows[0];
  return r ? r.parentId === null : false;
}

/** 댓글 1건 조회 (parent 검증용) */
export async function getCommentById(
  commentId: string,
): Promise<{ parentId: string | null; postId: string } | null> {
  const rows = await db
    .select({
      parentId: schema.bunnyBoardPostComments.parentId,
      postId: schema.bunnyBoardPostComments.postId,
    })
    .from(schema.bunnyBoardPostComments)
    .where(eq(schema.bunnyBoardPostComments.id, commentId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return { parentId: r.parentId ?? null, postId: r.postId };
}
