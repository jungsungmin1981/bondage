"use server";

import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { auth } from "@workspace/auth";
import {
  createClassRequest,
  getClassRequests,
  getClassRequestCount,
  getClassRequestById,
  updateClassRequestStatus,
  deleteClassRequest,
  getMemberProfileByUserId,
  type ClassRequestStatus,
} from "@workspace/db";
import { revalidatePath } from "next/cache";
import { isPrimaryAdmin } from "@/lib/admin";
import { uploadBufferToS3 } from "@/lib/s3-upload";
import { resizeToJpeg } from "@/lib/image/resize";
import { sendTelegramNotification } from "@/lib/telegram";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

async function checkIsAdmin(session: Awaited<ReturnType<typeof auth.api.getSession>>): Promise<boolean> {
  if (!session) return false;
  if (isPrimaryAdmin(session)) return true;
  const profile = await getMemberProfileByUserId(session.user.id);
  return profile?.memberType === "operator" && profile?.status === "approved";
}

export type CreateClassRequestFormState = {
  ok: false;
  error: string;
} | { ok: true } | null;

export async function createClassRequestAction(
  _prev: CreateClassRequestFormState,
  formData: FormData,
): Promise<CreateClassRequestFormState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const level = (formData.get("level") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() ?? "";
  const ropeThicknessMmRaw = formData.get("ropeThicknessMm");
  const ropeLengthMRaw = formData.get("ropeLengthM");
  const quantityRaw = formData.get("quantity");

  if (!title) return { ok: false, error: "제목을 입력해 주세요." };
  if (!level) return { ok: false, error: "난이도를 선택해 주세요." };
  if (!description) return { ok: false, error: "설명을 입력해 주세요." };
  if (title.length > 100) return { ok: false, error: "제목은 100자 이하로 입력해 주세요." };
  if (description.length > 2000) return { ok: false, error: "설명은 2000자 이하로 입력해 주세요." };

  const ropeThicknessMm = ropeThicknessMmRaw ? Number(ropeThicknessMmRaw) : null;
  const ropeLengthM = ropeLengthMRaw ? Number(ropeLengthMRaw) : null;
  const quantity = quantityRaw ? Number(quantityRaw) : null;

  // 이미지 업로드 처리 (최대 5장)
  const imageUrls: string[] = [];
  for (let i = 0; i < 5; i++) {
    const imageFile = formData.get(`image_${i}`) as File | null;
    if (!imageFile || imageFile.size === 0) continue;
    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const resized = await resizeToJpeg(buffer);
      const key = `class-requests/${randomUUID()}.jpg`;
      const url = await uploadBufferToS3(key, resized, "image/jpeg");
      imageUrls.push(url);
    } catch {
      return { ok: false, error: "이미지 업로드에 실패했습니다." };
    }
  }

  const profile = await getMemberProfileByUserId(session.user.id);
  const authorNickname =
    profile?.memberType === "operator"
      ? "운영진"
      : profile?.nickname ?? session.user.name ?? session.user.email ?? "알 수 없음";

  const id = randomUUID();
  await createClassRequest({
    id,
    userId: session.user.id,
    authorNickname,
    title,
    level,
    description,
    ropeThicknessMm,
    ropeLengthM,
    quantity,
    imageUrls,
  });

  const levelLabel: Record<string, string> = {
    beginner: "초급",
    intermediate: "중급",
    advanced: "고급",
  };
  await sendTelegramNotification(
    `📝 <b>새 클래스 요청</b>\n제목: ${title}\n난이도: ${levelLabel[level] ?? level}\n작성자: ${authorNickname}\n👉 /board/suggestion`,
  );

  revalidatePath("/board/suggestion");
  return { ok: true };
}

export async function listClassRequestsAction(opts?: {
  status?: ClassRequestStatus;
  limit?: number;
  offset?: number;
}) {
  return getClassRequests(opts);
}

export async function getClassRequestCountAction(opts?: { status?: ClassRequestStatus }) {
  return getClassRequestCount(opts);
}

export async function getClassRequestByIdAction(id: string) {
  return getClassRequestById(id);
}

export async function updateClassRequestStatusAction(
  id: string,
  status: ClassRequestStatus,
  adminNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || !(await checkIsAdmin(session))) {
    return { ok: false, error: "권한이 없습니다." };
  }
  await updateClassRequestStatus(id, status, adminNote);
  revalidatePath("/board/suggestion");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteClassRequestAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const request = await getClassRequestById(id);
  if (!request) return { ok: false, error: "요청을 찾을 수 없습니다." };
  const isAdmin = await checkIsAdmin(session);
  if (request.userId !== session.user.id && !isAdmin) {
    return { ok: false, error: "권한이 없습니다." };
  }
  await deleteClassRequest(id);
  revalidatePath("/board/suggestion");
  revalidatePath("/admin");
  return { ok: true };
}
