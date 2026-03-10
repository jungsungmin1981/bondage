import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type PhotoCommentRow = typeof schema.photoComments.$inferSelect;

export type PhotoCommentWithAuthor = PhotoCommentRow & {
  authorName: string | null;
};

export async function getCommentsByPhotoId(photoId: string): Promise<PhotoCommentRow[]> {
  return db
    .select()
    .from(schema.photoComments)
    .where(eq(schema.photoComments.photoId, photoId))
    .orderBy(asc(schema.photoComments.createdAt));
}

/** 댓글 + 작성자 닉네임(users.name), 없으면 null */
export async function getCommentsByPhotoIdWithAuthor(
  photoId: string,
): Promise<PhotoCommentWithAuthor[]> {
  const rows = await db
    .select({
      id: schema.photoComments.id,
      photoId: schema.photoComments.photoId,
      userId: schema.photoComments.userId,
      parentId: schema.photoComments.parentId,
      content: schema.photoComments.content,
      createdAt: schema.photoComments.createdAt,
      authorName: schema.users.name,
    })
    .from(schema.photoComments)
    .leftJoin(schema.users, eq(schema.photoComments.userId, schema.users.id))
    .where(eq(schema.photoComments.photoId, photoId))
    .orderBy(asc(schema.photoComments.createdAt));
  return rows;
}

/**
 * 여러 photoId 댓글을 한 번에 조회 후 photoId별로 묶음 (N회 쿼리 방지)
 */
export async function getCommentsByPhotoIdsWithAuthorGrouped(
  photoIds: string[],
): Promise<Map<string, PhotoCommentWithAuthor[]>> {
  const map = new Map<string, PhotoCommentWithAuthor[]>();
  const unique = [...new Set(photoIds.filter(Boolean))];
  if (unique.length === 0) return map;
  for (const id of unique) map.set(id, []);

  const rows = await db
    .select({
      id: schema.photoComments.id,
      photoId: schema.photoComments.photoId,
      userId: schema.photoComments.userId,
      parentId: schema.photoComments.parentId,
      content: schema.photoComments.content,
      createdAt: schema.photoComments.createdAt,
      authorName: schema.users.name,
    })
    .from(schema.photoComments)
    .leftJoin(schema.users, eq(schema.photoComments.userId, schema.users.id))
    .where(inArray(schema.photoComments.photoId, unique))
    .orderBy(asc(schema.photoComments.createdAt));

  for (const row of rows) {
    const list = map.get(row.photoId);
    if (list) list.push(row as PhotoCommentWithAuthor);
  }
  return map;
}

export async function insertPhotoComment(
  id: string,
  photoId: string,
  userId: string,
  content: string,
  parentId: string | null,
): Promise<void> {
  await db.insert(schema.photoComments).values({
    id,
    photoId,
    userId,
    parentId,
    content: content.slice(0, 500),
  });
}
