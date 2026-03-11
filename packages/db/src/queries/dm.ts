import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type ThreadListItem = {
  threadId: string;
  otherUserId: string;
  otherProfileId: string | null;
  otherNickname: string | null;
  otherIconUrl: string | null;
  otherMemberType: string | null;
  otherCardImageUrl: string | null;
  lastMessageBody: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  lastMessageFromMe: boolean;
};

async function assertParticipant(threadId: string, userId: string) {
  const rows = await db
    .select({ id: schema.dmParticipants.id })
    .from(schema.dmParticipants)
    .where(
      and(
        eq(schema.dmParticipants.threadId, threadId),
        eq(schema.dmParticipants.userId, userId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("권한이 없습니다.");
}

export async function ensureOneToOneThread(
  userA: string,
  userB: string,
): Promise<string> {
  if (userA === userB) throw new Error("잘못된 대상입니다.");

  // Find existing thread containing both participants (1:1 only by convention)
  const candidates = await db
    .select({ threadId: schema.dmParticipants.threadId })
    .from(schema.dmParticipants)
    .where(inArray(schema.dmParticipants.userId, [userA, userB]));

  const byThread = new Map<string, Set<string>>();
  for (const r of candidates) {
    const set = byThread.get(r.threadId) ?? new Set<string>();
    byThread.set(r.threadId, set);
    // We don't know which userId here; re-query would be expensive; do a second query:
  }

  // Second query: threads where both exist
  const rows = await db.execute<{ thread_id: string }>(sql`
    SELECT p1.thread_id
    FROM dm_participants p1
    JOIN dm_participants p2 ON p1.thread_id = p2.thread_id
    WHERE p1.user_id = ${userA} AND p2.user_id = ${userB}
    LIMIT 1
  `);
  const existing = (rows as any)?.[0]?.thread_id as string | undefined;
  if (existing) return existing;

  const threadId = crypto.randomUUID();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(schema.dmThreads).values({ id: threadId, createdAt: now });
    await tx.insert(schema.dmParticipants).values([
      { id: crypto.randomUUID(), threadId, userId: userA, joinedAt: now },
      { id: crypto.randomUUID(), threadId, userId: userB, joinedAt: now },
    ]);
  });
  return threadId;
}

export async function listThreadsForUser(userId: string): Promise<ThreadListItem[]> {
  // Threads the user participates in
  const parts = await db
    .select({ threadId: schema.dmParticipants.threadId })
    .from(schema.dmParticipants)
    .where(eq(schema.dmParticipants.userId, userId));
  const threadIds = parts.map((p) => p.threadId);
  if (threadIds.length === 0) return [];

  // Other participants (assume 1:1)
  const others = await db
    .select({
      threadId: schema.dmParticipants.threadId,
      otherUserId: schema.dmParticipants.userId,
    })
    .from(schema.dmParticipants)
    .where(and(inArray(schema.dmParticipants.threadId, threadIds), ne(schema.dmParticipants.userId, userId)));

  const otherByThread = new Map<string, string>();
  for (const o of others) otherByThread.set(o.threadId, o.otherUserId);

  const otherUserIds = [...new Set([...otherByThread.values()])];
  const profiles =
    otherUserIds.length === 0
      ? []
      : await db
          .select({
            userId: schema.memberProfiles.userId,
            profileId: schema.memberProfiles.id,
            nickname: schema.memberProfiles.nickname,
            iconUrl: schema.memberProfiles.iconUrl,
            memberType: schema.memberProfiles.memberType,
            cardImageUrl: schema.memberProfiles.cardImageUrl,
          })
          .from(schema.memberProfiles)
          .where(inArray(schema.memberProfiles.userId, otherUserIds));
  const profileByUserId = new Map<
    string,
    {
      profileId: string | null;
      nickname: string;
      iconUrl: string | null;
      memberType: string | null;
      cardImageUrl: string | null;
    }
  >();
  for (const p of profiles) {
    profileByUserId.set(p.userId, {
      profileId: p.profileId ?? null,
      nickname: p.nickname,
      iconUrl: p.iconUrl ?? null,
      memberType: p.memberType ?? null,
      cardImageUrl: p.cardImageUrl ?? null,
    });
  }

  // last message per thread (sql.array 미지원 버전 호환: 전체 메시지 내림차순 조회 후 thread별 첫 건 pick)
  const lastCandidates = await db
    .select({
      threadId: schema.dmMessages.threadId,
      body: schema.dmMessages.body,
      createdAt: schema.dmMessages.createdAt,
      senderUserId: schema.dmMessages.senderUserId,
    })
    .from(schema.dmMessages)
    .where(inArray(schema.dmMessages.threadId, threadIds))
    .orderBy(desc(schema.dmMessages.createdAt));
  const lastByThread = new Map<string, { body: string | null; at: Date; senderUserId: string }>();
  for (const m of lastCandidates) {
    if (!lastByThread.has(m.threadId)) {
      lastByThread.set(m.threadId, {
        body: m.body ?? null,
        at: m.createdAt,
        senderUserId: m.senderUserId,
      });
    }
  }

  // unread counts: messages newer than last_read_at (per thread)
  const unreadRows = await db
    .select({
      threadId: schema.dmParticipants.threadId,
      cnt: sql<number>`count(*)`,
    })
    .from(schema.dmParticipants)
    .innerJoin(
      schema.dmMessages,
      eq(schema.dmMessages.threadId, schema.dmParticipants.threadId),
    )
    .where(
      and(
        eq(schema.dmParticipants.userId, userId),
        inArray(schema.dmParticipants.threadId, threadIds),
        or(
          isNull(schema.dmParticipants.lastReadAt),
          gt(schema.dmMessages.createdAt, schema.dmParticipants.lastReadAt),
        ),
      ),
    )
    .groupBy(schema.dmParticipants.threadId);
  const unreadByThread = new Map<string, number>();
  for (const r of unreadRows) unreadByThread.set(r.threadId, Number(r.cnt ?? 0));

  // Assemble
  const out: ThreadListItem[] = [];
  for (const threadId of threadIds) {
    const otherUserId = otherByThread.get(threadId) ?? "";
    const profile = otherUserId ? profileByUserId.get(otherUserId) : undefined;
    const last = lastByThread.get(threadId);
    out.push({
      threadId,
      otherUserId,
      otherProfileId: profile?.profileId ?? null,
      otherNickname: profile?.nickname ?? null,
      otherIconUrl: profile?.iconUrl ?? null,
      otherMemberType: profile?.memberType ?? null,
      otherCardImageUrl: profile?.cardImageUrl ?? null,
      lastMessageBody: last?.body ?? null,
      lastMessageAt: last?.at ?? null,
      unreadCount: unreadByThread.get(threadId) ?? 0,
      lastMessageFromMe: last?.senderUserId === userId,
    });
  }
  out.sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0));
  return out;
}

export type ThreadMessage = {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string | null;
  createdAt: Date;
  attachments: { id: string; type: string; url: string }[];
};

export async function getThreadMessages(
  threadId: string,
  userId: string,
  limit = 50,
  cursor?: Date,
): Promise<ThreadMessage[]> {
  await assertParticipant(threadId, userId);
  const where = cursor
    ? and(eq(schema.dmMessages.threadId, threadId), lt(schema.dmMessages.createdAt, cursor))
    : eq(schema.dmMessages.threadId, threadId);
  const msgs = await db
    .select()
    .from(schema.dmMessages)
    .where(where)
    .orderBy(desc(schema.dmMessages.createdAt))
    .limit(limit);
  const messageIds = msgs.map((m) => m.id);
  const atts =
    messageIds.length === 0
      ? []
      : await db
          .select()
          .from(schema.dmAttachments)
          .where(inArray(schema.dmAttachments.messageId, messageIds));
  const byMsg = new Map<string, { id: string; type: string; url: string }[]>();
  for (const a of atts) {
    const arr = byMsg.get(a.messageId) ?? [];
    byMsg.set(a.messageId, arr);
    arr.push({ id: a.id, type: a.type, url: a.url });
  }
  return msgs
    .map((m) => ({
      id: m.id,
      threadId: m.threadId,
      senderUserId: m.senderUserId,
      body: m.body ?? null,
      createdAt: m.createdAt,
      attachments: byMsg.get(m.id) ?? [],
    }))
    .reverse();
}

export async function insertMessage(params: {
  threadId: string;
  senderUserId: string;
  body?: string | null;
  attachments?: { type: "image"; url: string }[];
}): Promise<string> {
  await assertParticipant(params.threadId, params.senderUserId);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(schema.dmMessages).values({
      id,
      threadId: params.threadId,
      senderUserId: params.senderUserId,
      body: params.body ?? null,
      createdAt: now,
    });
    if (params.attachments && params.attachments.length > 0) {
      await tx.insert(schema.dmAttachments).values(
        params.attachments.map((a) => ({
          id: crypto.randomUUID(),
          messageId: id,
          type: a.type,
          url: a.url,
        })),
      );
    }
    await tx
      .update(schema.dmThreads)
      .set({ lastMessageAt: now })
      .where(eq(schema.dmThreads.id, params.threadId));
  });
  return id;
}

export async function markThreadRead(
  threadId: string,
  userId: string,
  at = new Date(),
): Promise<void> {
  await db
    .update(schema.dmParticipants)
    .set({ lastReadAt: at })
    .where(and(eq(schema.dmParticipants.threadId, threadId), eq(schema.dmParticipants.userId, userId)));
}

export async function getUnreadCountForUser(userId: string): Promise<number> {
  const rows = await db.execute<{ cnt: number }>(sql`
    SELECT COUNT(*)::int AS cnt
    FROM dm_participants p
    JOIN dm_messages m ON m.thread_id = p.thread_id
    WHERE p.user_id = ${userId}
      AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
  `);
  return Number((rows as any)?.[0]?.cnt ?? 0);
}

