"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  getActiveSuspensionForUser,
  getAllSubmissionIdsForMonth,
  getSubmissionByUserAndMonth,
  getSubmissionIdsNotVotedByUser,
  getSubmissionsByIds,
  getVotedSubmissionByUserInMonth,
  hasUserVotedInMonth,
  insertMonthlyHotpickSubmission,
  insertMonthlyHotpickVote,
  updateMonthlyHotpickSubmissionImage,
  deleteMonthlyHotpickSubmission,
} from "@workspace/db";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { getPhase } from "@/lib/monthly-hotpick-period";
import { uploadBufferToS3 } from "@/lib/s3-upload";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const CARD_ASPECT = { w: 3, h: 4 };
const SERVER_RESIZE = { maxWidthOrHeight: 1280, jpegQuality: 82 };

function getExt(file: File | Blob): string {
  const type = file.type;
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/jpeg" || type === "image/jpg") return ".jpg";
  const name = (file as File & { name?: string }).name;
  if (typeof name === "string" && name.includes(".")) {
    return "." + name.split(".").pop()!.toLowerCase();
  }
  return ".jpg";
}

async function processImage(
  input: Buffer,
  originalExt: string,
): Promise<{ buffer: Buffer; ext: string }> {
  try {
    const size = SERVER_RESIZE.maxWidthOrHeight;
    const out = await sharp(input)
      .rotate()
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: SERVER_RESIZE.jpegQuality })
      .toBuffer();
    return { buffer: out, ext: ".jpg" };
  } catch {
    return { buffer: input, ext: originalExt };
  }
}

export async function submitMonthlyHotpickAction(
  monthKey: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const suspension = await getActiveSuspensionForUser(session.user.id);
  if (suspension) {
    return { ok: false, error: "계정 사용 제한 중에는 참가할 수 없습니다." };
  }

  const phase = getPhase(monthKey);
  if (phase !== "registration") {
    return { ok: false, error: "접수 기간이 아닙니다." };
  }

  const existing = await getSubmissionByUserAndMonth(monthKey, session.user.id);
  if (existing) {
    return { ok: false, error: "이번 달에는 이미 사진을 등록하셨습니다." };
  }

  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "사진을 선택해 주세요." };
  }
  if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "파일 크기는 10MB 이하여야 합니다." };
  }

  const originalExt = getExt(file);
  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  const { buffer: outputBuffer, ext } = await processImage(inputBuffer, originalExt);

  const id = randomUUID();
  const fileName = `${id}${ext}`;
  const s3Key = `uploads/monthly-hotpick/${monthKey}/${session.user.id}/${fileName}`;
  const imageUrl = await uploadBufferToS3(s3Key, outputBuffer, "image/jpeg");

  await insertMonthlyHotpickSubmission({
    id,
    month: monthKey,
    userId: session.user.id,
    imageUrl,
  });

  revalidatePath("/showoff");
  return { ok: true };
}

export async function replaceMonthlyHotpickAction(
  monthKey: string,
  submissionId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const suspension = await getActiveSuspensionForUser(session.user.id);
  if (suspension) {
    return { ok: false, error: "계정 사용 제한 중에는 변경할 수 없습니다." };
  }

  const phase = getPhase(monthKey);
  if (phase !== "registration") {
    return { ok: false, error: "접수 기간에만 사진을 변경할 수 있습니다." };
  }

  const existing = await getSubmissionByUserAndMonth(monthKey, session.user.id);
  if (!existing || existing.id !== submissionId) {
    return { ok: false, error: "본인 제출 건만 변경할 수 있습니다." };
  }

  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "사진을 선택해 주세요." };
  }
  if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "파일 크기는 10MB 이하여야 합니다." };
  }

  const originalExt = getExt(file);
  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  const { buffer: outputBuffer, ext } = await processImage(inputBuffer, originalExt);

  const uniqueId = randomUUID();
  const fileName = `${uniqueId}${ext}`;
  const s3Key = `uploads/monthly-hotpick/${monthKey}/${session.user.id}/${fileName}`;
  const imageUrl = await uploadBufferToS3(s3Key, outputBuffer, "image/jpeg");

  const updated = await updateMonthlyHotpickSubmissionImage(
    submissionId,
    session.user.id,
    imageUrl,
  );
  if (!updated) {
    return { ok: false, error: "변경에 실패했습니다." };
  }

  revalidatePath("/showoff");
  return { ok: true };
}

export async function deleteMonthlyHotpickAction(
  monthKey: string,
  submissionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const suspension = await getActiveSuspensionForUser(session.user.id);
  if (suspension) {
    return { ok: false, error: "계정 사용 제한 중에는 참가 취소할 수 없습니다." };
  }

  const phase = getPhase(monthKey);
  if (phase !== "registration") {
    return { ok: false, error: "접수 기간에만 참가 취소할 수 있습니다." };
  }

  const existing = await getSubmissionByUserAndMonth(monthKey, session.user.id);
  if (!existing || existing.id !== submissionId) {
    return { ok: false, error: "본인 제출 건만 취소할 수 있습니다." };
  }

  const deleted = await deleteMonthlyHotpickSubmission(
    submissionId,
    session.user.id,
  );
  if (!deleted) {
    return { ok: false, error: "취소에 실패했습니다." };
  }

  revalidatePath("/showoff");
  return { ok: true };
}

export async function voteMonthlyHotpickAction(
  submissionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const suspension = await getActiveSuspensionForUser(session.user.id);
  if (suspension) {
    return { ok: false, error: "계정 사용 제한 중에는 투표할 수 없습니다." };
  }

  const [submission] = await getSubmissionsByIds([submissionId]);
  if (!submission) {
    return { ok: false, error: "해당 접수가 없습니다." };
  }
  const alreadyVoted = await hasUserVotedInMonth(
    submission.month,
    session.user.id,
  );
  if (alreadyVoted) {
    return {
      ok: false,
      error: "이미 이번 달에 투표하셨습니다. 다음 투표 기간에 참여해 주세요.",
    };
  }

  const id = randomUUID();
  const result = await insertMonthlyHotpickVote({
    id,
    submissionId,
    voterUserId: session.user.id,
  });

  if (!result.ok) {
    return result;
  }
  revalidatePath("/showoff");
  revalidatePath("/showoff/vote");
  return { ok: true };
}

export async function getShowoffSubmissionsForVoting(
  monthKey: string,
  limit: number,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { items: [] };

  const ids = await getSubmissionIdsNotVotedByUser(
    monthKey,
    session.user.id,
    limit,
  );
  if (ids.length === 0) return { items: [] };
  const items = await getSubmissionsByIds(ids);
  return { items };
}

/** 토너먼트용: 해당 월 등록 사진 ID 전체 + 이미 투표 여부 + 투표한 접수(이미지 표시용). */
export async function getShowoffSubmissionIdsForVoting(monthKey: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { ids: [] as string[], alreadyVoted: false, votedSubmission: null };
  }

  const alreadyVoted = await hasUserVotedInMonth(monthKey, session.user.id);
  if (alreadyVoted) {
    const votedSubmission =
      await getVotedSubmissionByUserInMonth(monthKey, session.user.id);
    return { ids: [], alreadyVoted: true, votedSubmission };
  }

  const ids = await getAllSubmissionIdsForMonth(monthKey);
  return { ids, alreadyVoted: false, votedSubmission: null };
}

/** ID 목록에 해당하는 접수 건 조회 (해당 월 것만 반환). */
export async function getShowoffSubmissionsByIds(
  monthKey: string,
  ids: string[],
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || ids.length === 0) return { items: [] };

  const rows = await getSubmissionsByIds(ids);
  const items = rows.filter((r) => r.month === monthKey);
  return { items };
}
