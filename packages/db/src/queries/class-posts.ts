import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type ClassLevel = "beginner" | "intermediate" | "advanced";
export type ClassVisibility = "public" | "private";

export type CreateClassPostInput = {
  id: string;
  level: ClassLevel;
  visibility: ClassVisibility;
  title: string;
  description: string;
  ropeThicknessMm: number;
  ropeLengthM: number;
  quantity: number;
  coverImageUrl: string;
  extraImageUrls: string[];
  videoUrl?: string | null;
};

export type UpdateClassPostInput = Omit<CreateClassPostInput, "id" | "level">;

export async function createClassPost(input: CreateClassPostInput) {
  const inserted = await db
    .insert(schema.classPosts)
    .values({
      id: input.id,
      level: input.level,
      visibility: input.visibility,
      title: input.title,
      description: input.description,
      ropeThicknessMm: input.ropeThicknessMm,
      ropeLengthM: input.ropeLengthM,
      quantity: input.quantity,
      coverImageUrl: input.coverImageUrl,
      extraImageUrls: input.extraImageUrls,
      videoUrl: input.videoUrl ?? null,
      updatedAt: new Date(),
    })
    .returning();
  return inserted[0];
}

export async function updateClassPost(id: string, input: UpdateClassPostInput) {
  const updated = await db
    .update(schema.classPosts)
    .set({
      visibility: input.visibility,
      title: input.title,
      description: input.description,
      ropeThicknessMm: input.ropeThicknessMm,
      ropeLengthM: input.ropeLengthM,
      quantity: input.quantity,
      coverImageUrl: input.coverImageUrl,
      extraImageUrls: input.extraImageUrls,
      videoUrl: input.videoUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.classPosts.id, id))
    .returning();
  return updated[0];
}

export async function setClassPostVisibility(
  id: string,
  visibility: ClassVisibility,
) {
  const updated = await db
    .update(schema.classPosts)
    .set({ visibility, updatedAt: new Date() })
    .where(eq(schema.classPosts.id, id))
    .returning();
  return updated[0];
}

/** 클래스 게시물 완전 삭제 (관련 class_challenges 선 삭제 후 삭제) */
export async function deleteClassPost(id: string) {
  await db
    .delete(schema.classChallenges)
    .where(eq(schema.classChallenges.classPostId, id));
  const deleted = await db
    .delete(schema.classPosts)
    .where(eq(schema.classPosts.id, id))
    .returning();
  return deleted[0];
}

export async function listClassPostsByLevel(
  level: ClassLevel,
  opts?: { includePrivate?: boolean },
) {
  const includePrivate = opts?.includePrivate ?? true;
  return db
    .select()
    .from(schema.classPosts)
    .where(
      includePrivate
        ? eq(schema.classPosts.level, level)
        : and(eq(schema.classPosts.level, level), eq(schema.classPosts.visibility, "public")),
    )
    .orderBy(desc(schema.classPosts.createdAt));
}

export async function getPublicClassPostsByLevel(level: ClassLevel) {
  return db
    .select()
    .from(schema.classPosts)
    .where(and(eq(schema.classPosts.level, level), eq(schema.classPosts.visibility, "public")))
    .orderBy(desc(schema.classPosts.createdAt));
}

export type PublicClassPostCountsByLevel = {
  beginner: number;
  intermediate: number;
  advanced: number;
};

/** 레벨별 공개(public) 클래스 포스트 개수. */
export async function getPublicClassPostCountsByLevel(): Promise<PublicClassPostCountsByLevel> {
  const rows = await db
    .select({
      level: schema.classPosts.level,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.classPosts)
    .where(eq(schema.classPosts.visibility, "public"))
    .groupBy(schema.classPosts.level);

  const result: PublicClassPostCountsByLevel = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  };
  for (const row of rows) {
    if (row.level === "beginner" || row.level === "intermediate" || row.level === "advanced") {
      result[row.level] = row.count;
    }
  }
  return result;
}

