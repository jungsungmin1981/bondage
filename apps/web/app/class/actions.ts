"use server";

import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import {
  createClassChallenge,
  getChallengeByUserAndClassPost,
} from "@workspace/db";

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("로그인이 필요합니다.");
  return session;
}

export async function createClassChallengeAction(input: {
  classPostId: string;
  note: string;
  imageUrls: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await requireSession();
    const id = crypto.randomUUID();
    await createClassChallenge({
      id,
      classPostId: input.classPostId,
      userId: session.user.id,
      note: input.note.trim(),
      imageUrls: input.imageUrls,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "도전 신청 저장에 실패했습니다.",
    };
  }
}

export async function getMyChallengeForClassPostAction(
  classPostId: string,
): Promise<{ hasChallenge: boolean }> {
  try {
    const session = await requireSession();
    const row = await getChallengeByUserAndClassPost(session.user.id, classPostId);
    return { hasChallenge: !!row };
  } catch {
    return { hasChallenge: false };
  }
}
