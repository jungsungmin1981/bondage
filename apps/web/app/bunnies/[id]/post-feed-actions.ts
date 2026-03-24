"use server";

import { fetchBunnyPostsSlice, type BunnySliceResult } from "@/lib/bunny-posts-slice";

export async function loadMoreBunnyPosts(
  bunnyProfileId: string,
  offset: number,
  limit: number,
  userId: string,
): Promise<BunnySliceResult> {
  return fetchBunnyPostsSlice(bunnyProfileId, offset, limit, userId);
}
