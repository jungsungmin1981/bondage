"use server";

import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import {
  createClassChallenge,
  deleteRejectedClassChallenge,
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
    if (!input.imageUrls?.length) {
      return { ok: false, error: "이미지를 1장 이상 등록해주세요." };
    }
    const session = await requireSession();
    const existing = await getChallengeByUserAndClassPost(
      session.user.id,
      input.classPostId,
    );
    if (existing?.status === "rejected") {
      await deleteRejectedClassChallenge(existing.id);
    }
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
    const msg = typeof (e as Error).message === "string" ? (e as Error).message : String(e);
    const raw = e as { code?: string; constraint?: string };
    const isUniqueViolation =
      raw.code === "23505" ||
      raw.constraint === "class_challenges_user_post_unique" ||
      /duplicate key|unique constraint|class_challenges_user_post_unique/i.test(msg);
    if (isUniqueViolation) {
      return {
        ok: false,
        error: "이미 이 클래스에 도전을 신청하셨습니다. 같은 클래스에는 한 번만 도전할 수 있습니다.",
      };
    }
    return {
      ok: false,
      error: msg || "도전 신청 저장에 실패했습니다.",
    };
  }
}

export async function getMyChallengeForClassPostAction(
  classPostId: string,
): Promise<{ status: "pending" | "approved" | "rejected" | null }> {
  try {
    const session = await requireSession();
    const row = await getChallengeByUserAndClassPost(session.user.id, classPostId);
    if (!row) return { status: null };
    if (row.status === "pending" || row.status === "approved" || row.status === "rejected") {
      return { status: row.status };
    }
    return { status: null };
  } catch {
    return { status: null };
  }
}
