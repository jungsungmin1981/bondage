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

export async function listInboxDirectMessagesForUser(userId: string) {
  return db
    .select()
    .from(schema.directMessages)
    .where(eq(schema.directMessages.toUserId, userId))
    .orderBy(desc(schema.directMessages.createdAt));
}

