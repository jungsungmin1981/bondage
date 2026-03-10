"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  getCommentsByPhotoIdWithAuthor,
  insertPhotoComment,
} from "@workspace/db";
import { randomUUID } from "crypto";

export async function getPhotoComments(photoId: string) {
  return getCommentsByPhotoIdWithAuthor(photoId);
}

export async function addPhotoComment(
  riggerId: string,
  photoId: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "댓글을 입력해 주세요." };
  if (trimmed.length > 500) return { ok: false, error: "댓글은 500자 이내로 작성해 주세요." };
  try {
    await insertPhotoComment(randomUUID(), photoId, session.user.id, trimmed, null);
    revalidatePath(`/rigger/${encodeURIComponent(riggerId)}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "댓글 등록에 실패했습니다." };
  }
}
