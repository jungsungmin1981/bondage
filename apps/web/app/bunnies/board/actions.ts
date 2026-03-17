"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { auth } from "@workspace/auth";
import {
  createBunnyBoardPost,
  updateBunnyBoardPost,
  deleteBunnyBoardPost,
  updateBunnyBoardPostByAdmin,
  deleteBunnyBoardPostByAdmin,
  getBunnyBoardBySlug,
  getBunnyBoardPostById,
  createComment,
  updateComment,
  deleteComment,
  getCommentById,
  addRecommend,
  removeRecommend,
  hasUserRecommended,
} from "@workspace/db";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { uploadBufferToS3 } from "@/lib/s3-upload";
import { processBoardImage } from "@/lib/image/process-board-image";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BOARD_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BOARD_IMAGES = 3;

/** 본문 텍스트에 포함된 마크다운 이미지 개수 */
function countMarkdownImages(body: string): number {
  return (body.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length;
}

const TITLE_MAX_LENGTH = 200;
const BODY_MAX_LENGTH = 10_000;
const FREE_BOARD_SLUG = "free";
const NOTICE_BOARD_SLUG = "notice";
const QNA_BOARD_SLUG = "qna";

/** "YYYY-MM-DDTHH:mm" 또는 빈 문자열 → Date | null */
function parseScheduledPublishAt(value: FormDataEntryValue | null): Date | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return null;
  const date = new Date(s);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type CreatePostFormValues = {
  title: string;
  body: string;
  isPublished?: boolean;
  scheduledPublishAt?: string | null;
  sortOrder?: number;
};

export async function createBunnyBoardPostAction(
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: CreatePostFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";

  if (!title) return { ok: false, error: "제목을 입력해 주세요.", values: { title, body } };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values: { title, body },
    };
  }
  if (!body) return { ok: false, error: "내용을 입력해 주세요.", values: { title, body } };
  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `내용은 ${BODY_MAX_LENGTH}자 이하여야 합니다.`,
      values: { title, body },
    };
  }

  const board = await getBunnyBoardBySlug(FREE_BOARD_SLUG);
  if (!board) {
    return { ok: false, error: "자유게시판을 찾을 수 없습니다.", values: { title, body } };
  }

  const result = await createBunnyBoardPost(
    board.id,
    session.user.id,
    title,
    body,
  );
  if (!result.ok) return { ok: false, error: result.error, values: { title, body } };

  revalidatePath("/bunnies/board/free");
  redirect("/bunnies/board/free");
}

/** 관리자 전용: 버니 공지사항 게시판에 글 작성 (대표 이미지 선택 사항) */
export async function createBunnyBoardNoticePostAction(
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: CreatePostFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 공지를 작성할 수 있습니다." };
  }

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";
  const isPublishedRaw = formData.get("isPublished");
  const isPublished = isPublishedRaw !== "false" && isPublishedRaw !== "0";
  const scheduledPublishAt = parseScheduledPublishAt(formData.get("scheduledPublishAt"));
  const noticeValues = {
    title,
    body,
    isPublished,
    scheduledPublishAt: (formData.get("scheduledPublishAt") as string)?.trim() ?? "",
  };

  if (!title) return { ok: false, error: "제목을 입력해 주세요.", values: noticeValues };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values: noticeValues,
    };
  }
  if (!body) return { ok: false, error: "내용을 입력해 주세요.", values: noticeValues };
  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `내용은 ${BODY_MAX_LENGTH}자 이하여야 합니다.`,
      values: noticeValues,
    };
  }

  let coverImageUrl: string | null = null;
  const coverFile = formData.get("coverImage");
  if (coverFile && coverFile instanceof File && coverFile.size > 0) {
    const type = (coverFile.type ?? "").toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(type)) {
      return { ok: false, error: "대표 이미지는 JPEG, PNG, WebP만 가능합니다.", values: noticeValues };
    }
    if (coverFile.size > MAX_BOARD_IMAGE_SIZE) {
      return { ok: false, error: "대표 이미지는 10MB 이하여야 합니다.", values: noticeValues };
    }
    try {
      const arrayBuffer = await coverFile.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      const ext = type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
      const { buffer: outputBuffer } = await processBoardImage(inputBuffer, ext);
      const key = `uploads/board/notice/${session.user.id}/${randomUUID()}.jpg`;
      coverImageUrl = await uploadBufferToS3(key, outputBuffer, "image/jpeg");
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "대표 이미지 업로드에 실패했습니다.",
        values: noticeValues,
      };
    }
  }

  const board = await getBunnyBoardBySlug(NOTICE_BOARD_SLUG);
  if (!board) {
    return { ok: false, error: "공지사항 게시판을 찾을 수 없습니다.", values: noticeValues };
  }

  const result = await createBunnyBoardPost(
    board.id,
    session.user.id,
    title,
    body,
    coverImageUrl,
    isPublished,
    scheduledPublishAt,
  );
  if (!result.ok) return { ok: false, error: result.error, values: noticeValues };

  revalidatePath("/bunnies/board/notice");
  revalidatePath("/admin/notice/bunny");
  redirect("/admin/notice/bunny");
}

/** 관리자 전용: 버니 전용 Q&A 게시판에 글 작성 (제목 + 본문만) */
export async function createBunnyBoardQnaPostAction(
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: CreatePostFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 작성할 수 있습니다." };
  }

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";
  const isPublishedRaw = formData.get("isPublished");
  const isPublished =
    isPublishedRaw !== "false" && isPublishedRaw !== "0";
  const sortOrderRaw = (formData.get("sortOrder") as string)?.trim() ?? "";
  const sortOrder = sortOrderRaw === "" ? 0 : parseInt(sortOrderRaw, 10);
  const values = { title, body, isPublished, sortOrder };

  if (!title) return { ok: false, error: "제목을 입력해 주세요.", values };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values,
    };
  }
  if (!body) return { ok: false, error: "내용을 입력해 주세요.", values };
  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `내용은 ${BODY_MAX_LENGTH}자 이하여야 합니다.`,
      values,
    };
  }
  if (Number.isNaN(sortOrder) || sortOrder < 0 || !Number.isInteger(sortOrder)) {
    return {
      ok: false,
      error: "순서에는 0 이상의 정수만 입력할 수 있습니다.",
      values,
    };
  }

  const board = await getBunnyBoardBySlug(QNA_BOARD_SLUG);
  if (!board) {
    return {
      ok: false,
      error: "버니 전용 Q & A 게시판을 찾을 수 없습니다.",
      values,
    };
  }

  const result = await createBunnyBoardPost(
    board.id,
    session.user.id,
    title,
    body,
    null,
    isPublished,
    null,
    sortOrder,
  );
  if (!result.ok) return { ok: false, error: result.error, values };

  revalidatePath("/bunnies/board/qna");
  revalidatePath("/admin/notice/bunny-qna");
  redirect("/admin/notice/bunny-qna");
}

/** 관리자 전용: 버니 전용 Q&A 글 수정 */
export async function updateBunnyBoardQnaPostAction(
  postId: string,
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: CreatePostFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isAdmin(session)) {
    return { ok: false, error: "권한이 없습니다." };
  }

  const post = await getBunnyBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (post.boardSlug !== QNA_BOARD_SLUG) {
    return { ok: false, error: "버니 전용 Q & A 글만 수정할 수 있습니다." };
  }

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";
  const isPublishedRaw = formData.get("isPublished");
  const isPublished =
    isPublishedRaw !== "false" && isPublishedRaw !== "0";
  const sortOrderRaw = (formData.get("sortOrder") as string)?.trim() ?? "";
  const sortOrder = sortOrderRaw === "" ? 0 : parseInt(sortOrderRaw, 10);
  const values = { title, body, isPublished, sortOrder };

  if (!title) return { ok: false, error: "제목을 입력해 주세요.", values };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values,
    };
  }
  if (!body) return { ok: false, error: "내용을 입력해 주세요.", values };
  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `내용은 ${BODY_MAX_LENGTH}자 이하여야 합니다.`,
      values,
    };
  }
  if (Number.isNaN(sortOrder) || sortOrder < 0 || !Number.isInteger(sortOrder)) {
    return {
      ok: false,
      error: "순서에는 0 이상의 정수만 입력할 수 있습니다.",
      values,
    };
  }

  const result = await updateBunnyBoardPostByAdmin(postId, {
    title,
    body,
    isPublished,
    sortOrder,
    updatedByUserId: session.user.id,
  });
  if (!result.ok) return { ok: false, error: result.error, values };

  revalidatePath("/bunnies/board/qna");
  revalidatePath("/admin/notice/bunny-qna");
  revalidatePath(`/admin/notice/bunny-qna/${postId}/edit`);
  redirect("/admin/notice/bunny-qna");
}

/** 관리자 전용: 버니 전용 Q&A 글 삭제 */
export async function deleteBunnyBoardQnaPostAction(
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 삭제할 수 있습니다." };
  }

  const post = await getBunnyBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (post.boardSlug !== QNA_BOARD_SLUG) {
    return { ok: false, error: "버니 전용 Q & A 글만 삭제할 수 있습니다." };
  }

  const result = await deleteBunnyBoardPostByAdmin(postId);
  if (!result.ok) return result;

  revalidatePath("/bunnies/board/qna");
  revalidatePath("/admin/notice/bunny-qna");
  redirect("/admin/notice/bunny-qna");
}

/** 관리자 전용: 버니 전용 Q&A 글 삭제 (폼에서 postId 전달용) */
export async function deleteBunnyBoardQnaPostFormAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  return deleteBunnyBoardQnaPostAction(postId);
}

/** 관리자 전용: 버니 공지 수정 */
export async function updateBunnyBoardNoticePostAction(
  postId: string,
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: CreatePostFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 공지를 수정할 수 있습니다." };
  }

  const post = await getBunnyBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (post.boardSlug !== NOTICE_BOARD_SLUG) {
    return { ok: false, error: "공지사항 글만 수정할 수 있습니다." };
  }

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";
  const isPublishedRaw = formData.get("isPublished");
  const isPublished = isPublishedRaw !== "false" && isPublishedRaw !== "0";
  const scheduledPublishAt = parseScheduledPublishAt(formData.get("scheduledPublishAt"));
  const noticeValues = {
    title,
    body,
    isPublished,
    scheduledPublishAt: (formData.get("scheduledPublishAt") as string)?.trim() ?? "",
  };

  if (!title) return { ok: false, error: "제목을 입력해 주세요.", values: noticeValues };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values: noticeValues,
    };
  }
  if (!body) return { ok: false, error: "내용을 입력해 주세요.", values: noticeValues };
  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `내용은 ${BODY_MAX_LENGTH}자 이하여야 합니다.`,
      values: noticeValues,
    };
  }

  let coverImageUrl: string | null | undefined = undefined;
  const coverFile = formData.get("coverImage");
  if (coverFile && coverFile instanceof File && coverFile.size > 0) {
    const type = (coverFile.type ?? "").toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(type)) {
      return { ok: false, error: "대표 이미지는 JPEG, PNG, WebP만 가능합니다.", values: noticeValues };
    }
    if (coverFile.size > MAX_BOARD_IMAGE_SIZE) {
      return { ok: false, error: "대표 이미지는 10MB 이하여야 합니다.", values: noticeValues };
    }
    try {
      const arrayBuffer = await coverFile.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      const ext = type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
      const { buffer: outputBuffer } = await processBoardImage(inputBuffer, ext);
      const key = `uploads/board/notice/${session.user.id}/${randomUUID()}.jpg`;
      coverImageUrl = await uploadBufferToS3(key, outputBuffer, "image/jpeg");
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "대표 이미지 업로드에 실패했습니다.",
        values: noticeValues,
      };
    }
  }

  const result = await updateBunnyBoardPostByAdmin(postId, {
    title,
    body,
    coverImageUrl,
    isPublished,
    scheduledPublishAt,
    updatedByUserId: session.user.id,
  });
  if (!result.ok) return { ok: false, error: result.error, values: noticeValues };

  revalidatePath("/bunnies/board/notice");
  revalidatePath("/admin/notice/bunny");
  revalidatePath(`/admin/notice/bunny/${postId}/edit`);
  redirect("/admin/notice/bunny");
}

/** 관리자 전용: 버니 공지 삭제 */
export async function deleteBunnyBoardNoticePostAction(
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 공지를 삭제할 수 있습니다." };
  }

  const post = await getBunnyBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (post.boardSlug !== NOTICE_BOARD_SLUG) {
    return { ok: false, error: "공지사항 글만 삭제할 수 있습니다." };
  }

  const result = await deleteBunnyBoardPostByAdmin(postId);
  if (!result.ok) return result;

  revalidatePath("/bunnies/board/notice");
  revalidatePath("/admin/notice/bunny");
  redirect("/admin/notice/bunny");
}

/** 관리자 전용: 버니 공지 삭제 (폼에서 postId 전달용) */
export async function deleteBunnyBoardNoticePostFormAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  return deleteBunnyBoardNoticePostAction(postId);
}

export async function uploadBoardImageAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "이미지 파일을 선택해 주세요." };
  }

  const body = (formData.get("body") as string) ?? "";
  const imageCount = countMarkdownImages(body);
  if (imageCount >= MAX_BOARD_IMAGES) {
    return {
      ok: false,
      error: `이미지는 최대 ${MAX_BOARD_IMAGES}장까지 등록할 수 있습니다.`,
    };
  }

  const type = (file.type ?? "").toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };
  }
  if (file.size > MAX_BOARD_IMAGE_SIZE) {
    return { ok: false, error: "이미지는 10MB 이하여야 합니다." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const ext = type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
    const { buffer: outputBuffer } = await processBoardImage(inputBuffer, ext);
    const key = `uploads/board/free/${session.user.id}/${randomUUID()}.jpg`;
    const url = await uploadBufferToS3(key, outputBuffer, "image/jpeg");
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "이미지 업로드에 실패했습니다.",
    };
  }
}

export async function toggleRecommendAction(
  postId: string,
): Promise<{ ok: true; recommended: boolean } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const post = await getBunnyBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (post.boardSlug !== FREE_BOARD_SLUG) {
    return { ok: false, error: "자유 게시판 글만 추천할 수 있습니다." };
  }

  const recommended = await hasUserRecommended(postId, session.user.id);
  if (recommended) {
    await removeRecommend(postId, session.user.id);
    revalidatePath("/bunnies/board/free");
    revalidatePath(`/bunnies/board/free/${postId}`);
    return { ok: true, recommended: false };
  }
  const result = await addRecommend(postId, session.user.id);
  if (!result.ok) return result;
  revalidatePath("/bunnies/board/free");
  revalidatePath(`/bunnies/board/free/${postId}`);
  return { ok: true, recommended: true };
}

export type UpdatePostFormValues = { title: string; body: string };

export async function updateBunnyBoardPostAction(
  postId: string,
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: UpdatePostFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";

  if (!title) return { ok: false, error: "제목을 입력해 주세요.", values: { title, body } };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values: { title, body },
    };
  }
  if (!body) return { ok: false, error: "내용을 입력해 주세요.", values: { title, body } };
  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `내용은 ${BODY_MAX_LENGTH}자 이하여야 합니다.`,
      values: { title, body },
    };
  }

  const result = await updateBunnyBoardPost(postId, session.user.id, {
    title,
    body,
  });
  if (!result.ok) return { ok: false, error: result.error, values: { title, body } };

  revalidatePath("/bunnies/board/free");
  revalidatePath(`/bunnies/board/free/${postId}`);
  redirect(`/bunnies/board/free/${postId}`);
}

export async function deleteBunnyBoardPostAction(
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const result = await deleteBunnyBoardPost(postId, session.user.id);
  if (!result.ok) return result;

  revalidatePath("/bunnies/board/free");
  redirect("/bunnies/board/free");
}

/** Form에서 postId를 넘겨받아 삭제. formData.get("postId") 사용. */
export async function deleteBunnyBoardPostFormAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  return deleteBunnyBoardPostAction(postId);
}

// --- 댓글·답글 ---
const COMMENT_BODY_MAX_LENGTH = 2000;

export async function createCommentAction(
  postId: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const post = await getBunnyBoardPostById(postId);
  if (!post) return { ok: false, error: "글을 찾을 수 없습니다." };
  if (post.boardSlug !== FREE_BOARD_SLUG) {
    return { ok: false, error: "이 게시판에서는 댓글을 작성할 수 없습니다." };
  }

  const body = (formData.get("body") as string)?.trim() ?? "";
  const parentId = (formData.get("parentId") as string)?.trim() || null;

  if (!body) return { ok: false, error: "내용을 입력해 주세요." };
  if (body.length > COMMENT_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `댓글은 ${COMMENT_BODY_MAX_LENGTH}자 이하여야 합니다.`,
    };
  }

  if (parentId) {
    const parent = await getCommentById(parentId);
    if (!parent) return { ok: false, error: "답글 대상 댓글을 찾을 수 없습니다." };
    if (parent.postId !== postId) return { ok: false, error: "잘못된 요청입니다." };
    if (parent.parentId !== null) {
      return { ok: false, error: "답글에는 답글을 달 수 없습니다." };
    }
  }

  const result = await createComment(postId, session.user.id, body, parentId ?? undefined);
  if (!result.ok) return result;

  revalidatePath(`/bunnies/board/free/${postId}`);
  return { ok: true };
}

export async function updateCommentAction(
  commentId: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const body = (formData.get("body") as string)?.trim() ?? "";
  if (!body) return { ok: false, error: "내용을 입력해 주세요." };
  if (body.length > COMMENT_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `댓글은 ${COMMENT_BODY_MAX_LENGTH}자 이하여야 합니다.`,
    };
  }

  const result = await updateComment(commentId, session.user.id, body);
  if (!result.ok) return result;

  const comment = await getCommentById(commentId);
  if (comment) {
    const post = await getBunnyBoardPostById(comment.postId);
    if (post) revalidatePath(`/bunnies/board/free/${comment.postId}`);
  }
  return { ok: true };
}

export async function deleteCommentAction(
  commentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const result = await deleteComment(commentId, session.user.id);
  if (!result.ok) return result;

  const comment = await getCommentById(commentId);
  if (comment) {
    revalidatePath(`/bunnies/board/free/${comment.postId}`);
  }
  return { ok: true };
}
