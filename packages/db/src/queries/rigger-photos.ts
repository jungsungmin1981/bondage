import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export async function getRiggerPhotos(riggerId: string) {
  return db
    .select()
    .from(schema.riggerPhotos)
    .where(eq(schema.riggerPhotos.riggerId, riggerId))
    .orderBy(desc(schema.riggerPhotos.createdAt));
}

export type RiggerPhotoRow = Awaited<ReturnType<typeof getRiggerPhotos>>[number];

export type RiggerPhotoPost = {
  postId: string;
  createdAt: Date;
  caption: string | null;
  photos: RiggerPhotoRow[];
};

export function groupPhotosByPost(photos: RiggerPhotoRow[]): RiggerPhotoPost[] {
  const byPost = new Map<string, RiggerPhotoRow[]>();
  for (const p of photos) {
    const key = p.postId ?? p.id;
    if (!byPost.has(key)) byPost.set(key, []);
    byPost.get(key)!.push(p);
  }
  for (const arr of byPost.values()) {
    arr.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }
  const posts: RiggerPhotoPost[] = [];
  for (const [postId, photosInPost] of byPost.entries()) {
    const first = photosInPost[0];
    if (!first) continue;
    posts.push({
      postId,
      createdAt: first.createdAt ?? new Date(),
      caption: first.caption,
      photos: photosInPost,
    });
  }
  posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return posts;
}

export async function getRiggerPhotoPosts(riggerId: string): Promise<RiggerPhotoPost[]> {
  const photos = await getRiggerPhotos(riggerId);
  return groupPhotosByPost(photos);
}

/**
 * 해당 postId(또는 post_id 없는 예전 글의 사진 id)가 주어진 userId 소유인지
 * — 본인 게시물 좋아요 방지 등에 사용
 */
export async function isPostOwnedByUser(postId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: schema.riggerPhotos.userId })
    .from(schema.riggerPhotos)
    .where(
      or(eq(schema.riggerPhotos.postId, postId), eq(schema.riggerPhotos.id, postId)),
    )
    .limit(1);
  return rows[0]?.userId === userId;
}

/**
 * 본인 게시물 삭제 (postId 기준, 레거시: post_id 없는 경우 id도 허용)
 */
export async function deleteRiggerPostOwnedByUser(
  riggerId: string,
  postId: string,
  userId: string,
): Promise<number> {
  const deleted = await db
    .delete(schema.riggerPhotos)
    .where(
      and(
        eq(schema.riggerPhotos.riggerId, riggerId),
        eq(schema.riggerPhotos.userId, userId),
        or(eq(schema.riggerPhotos.postId, postId), eq(schema.riggerPhotos.id, postId)),
      ),
    )
    .returning({ id: schema.riggerPhotos.id });
  return deleted.length;
}

export async function updateRiggerPostVisibilityOwnedByUser(
  riggerId: string,
  postId: string,
  userId: string,
  visibility: "public" | "private",
): Promise<number> {
  const updated = await db
    .update(schema.riggerPhotos)
    .set({ visibility })
    .where(
      and(
        eq(schema.riggerPhotos.riggerId, riggerId),
        eq(schema.riggerPhotos.userId, userId),
        or(eq(schema.riggerPhotos.postId, postId), eq(schema.riggerPhotos.id, postId)),
      ),
    )
    .returning({ id: schema.riggerPhotos.id });
  return updated.length;
}
