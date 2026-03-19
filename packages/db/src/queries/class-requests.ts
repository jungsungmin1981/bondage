import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type ClassRequestStatus = "pending" | "reviewing" | "done" | "rejected";

export type CreateClassRequestInput = {
  id: string;
  userId: string;
  authorNickname: string;
  title: string;
  level: string;
  description: string;
  ropeThicknessMm?: number | null;
  ropeLengthM?: number | null;
  quantity?: number | null;
  imageUrls?: string[];
};

export type ClassRequestRow = typeof schema.classRequests.$inferSelect;

export async function createClassRequest(input: CreateClassRequestInput) {
  const inserted = await db
    .insert(schema.classRequests)
    .values({
      id: input.id,
      userId: input.userId,
      authorNickname: input.authorNickname,
      title: input.title,
      level: input.level,
      description: input.description,
      ropeThicknessMm: input.ropeThicknessMm ?? null,
      ropeLengthM: input.ropeLengthM ?? null,
      quantity: input.quantity ?? null,
      imageUrls: input.imageUrls ?? [],
      status: "pending",
      updatedAt: new Date(),
    })
    .returning();
  return inserted[0];
}

export async function getClassRequests(opts?: {
  status?: ClassRequestStatus;
  limit?: number;
  offset?: number;
}) {
  const conditions = opts?.status
    ? [eq(schema.classRequests.status, opts.status)]
    : [];

  return db
    .select()
    .from(schema.classRequests)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.classRequests.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

export async function getClassRequestCount(opts?: { status?: ClassRequestStatus }) {
  const conditions = opts?.status
    ? [eq(schema.classRequests.status, opts.status)]
    : [];

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.classRequests)
    .where(conditions.length ? and(...conditions) : undefined);

  return result[0]?.count ?? 0;
}

export async function getClassRequestById(id: string) {
  const rows = await db
    .select()
    .from(schema.classRequests)
    .where(eq(schema.classRequests.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateClassRequestStatus(
  id: string,
  status: ClassRequestStatus,
  adminNote?: string,
) {
  const updated = await db
    .update(schema.classRequests)
    .set({
      status,
      adminNote: adminNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.classRequests.id, id))
    .returning();
  return updated[0];
}

export async function deleteClassRequest(id: string) {
  const deleted = await db
    .delete(schema.classRequests)
    .where(eq(schema.classRequests.id, id))
    .returning();
  return deleted[0];
}
