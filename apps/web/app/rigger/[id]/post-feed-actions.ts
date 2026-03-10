"use server";

import { fetchRiggerPostsSlice, type SliceResult } from "@/lib/rigger-posts-slice";

export async function loadMoreRiggerPosts(
  riggerId: string,
  offset: number,
  limit: number,
  userId: string,
): Promise<SliceResult> {
  return fetchRiggerPostsSlice(riggerId, offset, limit, userId);
}
