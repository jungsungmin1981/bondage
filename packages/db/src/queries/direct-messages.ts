import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export async function getUnreadDirectMessagesCountForUser(
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.directMessages)
    .where(and(eq(schema.directMessages.toUserId, userId), isNull(schema.directMessages.readAt)));
  return Number(rows[0]?.count ?? 0);
}

/** 수신 목록 + 발신자 이름 (users 조인) + 클래스 도전 반려 시 게시물 레벨·제목 (class_posts 조인) */
export async function listInboxDirectMessagesForUserWithSender(userId: string) {
  const rows = await db
    .select({
      id: schema.directMessages.id,
      fromUserId: schema.directMessages.fromUserId,
      toUserId: schema.directMessages.toUserId,
      title: schema.directMessages.title,
      body: schema.directMessages.body,
      source: schema.directMessages.source,
      imageUrls: schema.directMessages.imageUrls,
      classPostId: schema.directMessages.classPostId,
      readAt: schema.directMessages.readAt,
      createdAt: schema.directMessages.createdAt,
      senderName: schema.users.name,
      classPostLevel: schema.classPosts.level,
      classPostTitle: schema.classPosts.title,
    })
    .from(schema.directMessages)
    .leftJoin(schema.users, eq(schema.directMessages.fromUserId, schema.users.id))
    .leftJoin(
      schema.classPosts,
      eq(schema.directMessages.classPostId, schema.classPosts.id),
    )
    .where(eq(schema.directMessages.toUserId, userId))
    .orderBy(desc(schema.directMessages.createdAt));
  return rows.map((r) => ({
    ...r,
    imageUrls: Array.isArray(r.imageUrls) ? (r.imageUrls as string[]) : [],
    classPostLevel: r.classPostLevel ?? null,
    classPostTitle: r.classPostTitle ?? null,
  }));
}

export async function insertDirectMessage(params: {
  fromUserId: string;
  toUserId: string;
  title?: string | null;
  body: string;
  source?: string | null;
  imageUrls?: string[] | null;
  classPostId?: string | null;
}) {
  await db.insert(schema.directMessages).values({
    id: randomUUID(),
    fromUserId: params.fromUserId,
    toUserId: params.toUserId,
    title: params.title ?? null,
    body: params.body,
    source: params.source ?? null,
    imageUrls: params.imageUrls ?? null,
    classPostId: params.classPostId ?? null,
  });
}

export async function markDirectMessageAsRead(
  messageId: string,
  toUserId: string,
): Promise<boolean> {
  const updated = await db
    .update(schema.directMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.directMessages.id, messageId),
        eq(schema.directMessages.toUserId, toUserId),
      ),
    )
    .returning({ id: schema.directMessages.id });
  return updated.length > 0;
}

/** 수신자 본인만 삭제 가능 */
export async function deleteDirectMessage(
  messageId: string,
  toUserId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(schema.directMessages)
    .where(
      and(
        eq(schema.directMessages.id, messageId),
        eq(schema.directMessages.toUserId, toUserId),
      ),
    )
    .returning({ id: schema.directMessages.id });
  return deleted.length > 0;
}

export async function getDirectMessageByIdAndToUser(
  messageId: string,
  toUserId: string,
) {
  const rows = await db
    .select()
    .from(schema.directMessages)
    .where(
      and(
        eq(schema.directMessages.id, messageId),
        eq(schema.directMessages.toUserId, toUserId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** 상세 보기: 메시지 + 발신자 이름 */
export async function getDirectMessageByIdAndToUserWithSender(
  messageId: string,
  toUserId: string,
) {
  const rows = await db
    .select({
      id: schema.directMessages.id,
      fromUserId: schema.directMessages.fromUserId,
      title: schema.directMessages.title,
      body: schema.directMessages.body,
      source: schema.directMessages.source,
      imageUrls: schema.directMessages.imageUrls,
      readAt: schema.directMessages.readAt,
      createdAt: schema.directMessages.createdAt,
      senderName: schema.users.name,
    })
    .from(schema.directMessages)
    .leftJoin(schema.users, eq(schema.directMessages.fromUserId, schema.users.id))
    .where(
      and(
        eq(schema.directMessages.id, messageId),
        eq(schema.directMessages.toUserId, toUserId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    imageUrls: Array.isArray(row.imageUrls) ? (row.imageUrls as string[]) : [],
  };
}

