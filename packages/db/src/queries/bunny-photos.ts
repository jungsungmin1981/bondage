import { desc, eq } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export async function getBunnyPhotos(bunnyProfileId: string, limit = 50) {
  return db
    .select()
    .from(schema.bunnyPhotos)
    .where(eq(schema.bunnyPhotos.bunnyProfileId, bunnyProfileId))
    .orderBy(desc(schema.bunnyPhotos.createdAt))
    .limit(limit);
}

export type BunnyPhotoRow = Awaited<ReturnType<typeof getBunnyPhotos>>[number];
