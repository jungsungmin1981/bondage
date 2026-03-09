import { desc, eq } from "drizzle-orm";
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
