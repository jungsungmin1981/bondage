"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { auth } from "@workspace/auth";
import {
  createSharedBoardPost,
  updateSharedBoardPost,
  deleteSharedBoardPost,
  updateSharedBoardPostByAdmin,
  deleteSharedBoardPostByAdmin,
  getSharedBoardBySlug,
  getSharedBoardPostById,
  createSharedBoardComment,
  updateSharedBoardComment,
  deleteSharedBoardComment,
  getSharedBoardCommentById,
  addSharedBoardRecommend,
  removeSharedBoardRecommend,
  hasUserRecommendedSharedBoard,
} from "@workspace/db";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { uploadBufferToS3 } from "@/lib/s3-upload";
import { processBoardImage } from "@/lib/image/process-board-image";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BOARD_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BOARD_IMAGES = 3;

function countMarkdownImages(body: string): number {
  return (body.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length;
}

const TITLE_MAX_LENGTH = 200;
const BODY_MAX_LENGTH = 10_000;
const COMMENT_BODY_MAX_LENGTH = 2000;
const FREE_BOARD_SLUG = "free";
const SUGGESTION_BOARD_SLUG = "suggestion";
const QNA_BOARD_SLUG = "qna";
const NOTICE_BOARD_SLUG = "notice";

/** 댓글·추천이 가능한 게시판 (free, suggestion, qna) */
const COMMENT_RECOMMEND_BOARD_SLUGS = [
  FREE_BOARD_SLUG,
  SUGGESTION_BOARD_SLUG,
  QNA_BOARD_SLUG,
] as const;

export type CreatePostFormValues = {
  title: string;
  body: string;
  isPublished?: boolean;
  sortOrder?: number;
};

export async function createSharedBoardPostAction(
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

  const boardSlug =
    ((formData.get("boardSlug") as string)?.trim() || FREE_BOARD_SLUG) as
      | "free"
      | "suggestion"
      | "qna"
      | "notice";
  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";

  if (!title)
    return { ok: false, error: "제목을 입력해 주세요.", values: { title, body } };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values: { title, body },
    };
  }
  if (!body)
    return { ok: false, error: "내용을 입력해 주세요.", values: { title, body } };
  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `내용은 ${BODY_MAX_LENGTH}자 이하여야 합니다.`,
      values: { title, body },
    };
  }

  if (boardSlug === NOTICE_BOARD_SLUG) {
    if (!isAdmin(session)) {
      return { ok: false, error: "권한이 없습니다.", values: { title, body } };
    }
  } else if (
    boardSlug !== FREE_BOARD_SLUG &&
    boardSlug !== SUGGESTION_BOARD_SLUG &&
    boardSlug !== QNA_BOARD_SLUG
  ) {
    return {
      ok: false,
      error: "해당 게시판에 글을 쓸 수 없습니다.",
      values: { title, body },
    };
  }

  const board = await getSharedBoardBySlug(boardSlug);
  if (!board) {
    return {
      ok: false,
      error: "게시판을 찾을 수 없습니다.",
      values: { title, body },
    };
  }

  const result = await createSharedBoardPost(
    board.id,
    session.user.id,
    title,
    body,
  );
  if (!result.ok)
    return { ok: false, error: result.error, values: { title, body } };

  revalidatePath("/board");
  revalidatePath(`/board/${boardSlug}`);
  redirect(`/board/${boardSlug}`);
}

/** 관리자 전용: 공용 Q&A 게시판에 글 작성 (제목 + 본문만) */
export async function createAdminSharedBoardQnaPostAction(
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

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";
  const isPublishedRaw = formData.get("isPublished");
  const isPublished =
    isPublishedRaw !== "false" && isPublishedRaw !== "0";
  const sortOrderRaw = (formData.get("sortOrder") as string)?.trim() ?? "";
  const sortOrder = sortOrderRaw === "" ? 0 : parseInt(sortOrderRaw, 10);
  const values = { title, body, isPublished, sortOrder };

  if (!title)
    return { ok: false, error: "제목을 입력해 주세요.", values };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values,
    };
  }
  if (!body)
    return { ok: false, error: "내용을 입력해 주세요.", values };
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

  const board = await getSharedBoardBySlug(QNA_BOARD_SLUG);
  if (!board) {
    return {
      ok: false,
      error: "Q & A 게시판을 찾을 수 없습니다.",
      values,
    };
  }

  const result = await createSharedBoardPost(
    board.id,
    session.user.id,
    title,
    body,
    null,
    isPublished,
    null,
    sortOrder,
  );
  if (!result.ok)
    return { ok: false, error: result.error, values };

  revalidatePath("/board/qna");
  revalidatePath("/admin/notice/qna");
  redirect("/admin/notice/qna");
}

/** 관리자 전용: 공용 Q&A 글 수정 */
export async function updateAdminSharedBoardQnaPostAction(
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

  const post = await getSharedBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (post.boardSlug !== QNA_BOARD_SLUG) {
    return { ok: false, error: "Q & A 글만 수정할 수 있습니다." };
  }

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";
  const isPublishedRaw = formData.get("isPublished");
  const isPublished =
    isPublishedRaw !== "false" && isPublishedRaw !== "0";
  const sortOrderRaw = (formData.get("sortOrder") as string)?.trim() ?? "";
  const sortOrder = sortOrderRaw === "" ? 0 : parseInt(sortOrderRaw, 10);
  const values = { title, body, isPublished, sortOrder };

  if (!title)
    return { ok: false, error: "제목을 입력해 주세요.", values };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values,
    };
  }
  if (!body)
    return { ok: false, error: "내용을 입력해 주세요.", values };
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

  const result = await updateSharedBoardPostByAdmin(postId, {
    title,
    body,
    isPublished,
    sortOrder,
    updatedByUserId: session.user.id,
  });
  if (!result.ok)
    return { ok: false, error: result.error, values };

  revalidatePath("/board/qna");
  revalidatePath("/admin/notice/qna");
  revalidatePath(`/admin/notice/qna/${postId}/edit`);
  redirect("/admin/notice/qna");
}

/** 관리자 전용: 공용 Q&A 글 삭제 */
export async function deleteAdminSharedBoardQnaPostAction(
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 삭제할 수 있습니다." };
  }

  const post = await getSharedBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (post.boardSlug !== QNA_BOARD_SLUG) {
    return { ok: false, error: "Q & A 글만 삭제할 수 있습니다." };
  }

  const result = await deleteSharedBoardPostByAdmin(postId);
  if (!result.ok) return result;

  revalidatePath("/board/qna");
  revalidatePath("/admin/notice/qna");
  redirect("/admin/notice/qna");
}

/** 관리자 전용: 공용 Q&A 글 삭제 (폼에서 postId 전달용) */
export async function deleteAdminSharedBoardQnaPostFormAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  return deleteAdminSharedBoardQnaPostAction(postId);
}

export async function uploadSharedBoardImageAction(
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
    const ext =
      type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
    const { buffer: outputBuffer } = await processBoardImage(inputBuffer, ext);
    const key = `uploads/board/shared/${session.user.id}/${randomUUID()}.jpg`;
    const url = await uploadBufferToS3(key, outputBuffer, "image/jpeg");
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "이미지 업로드에 실패했습니다.",
    };
  }
}

export async function toggleSharedBoardRecommendAction(
  postId: string,
): Promise<{ ok: true; recommended: boolean } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const post = await getSharedBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (!COMMENT_RECOMMEND_BOARD_SLUGS.includes(post.boardSlug as (typeof COMMENT_RECOMMEND_BOARD_SLUGS)[number])) {
    return { ok: false, error: "이 게시판 글은 추천할 수 없습니다." };
  }

  const recommended = await hasUserRecommendedSharedBoard(
    postId,
    session.user.id,
  );
  if (recommended) {
    await removeSharedBoardRecommend(postId, session.user.id);
    revalidatePath(`/board/${post.boardSlug}`);
    revalidatePath(`/board/${post.boardSlug}/${postId}`);
    return { ok: true, recommended: false };
  }
  const result = await addSharedBoardRecommend(postId, session.user.id);
  if (!result.ok) return result;
  revalidatePath(`/board/${post.boardSlug}`);
  revalidatePath(`/board/${post.boardSlug}/${postId}`);
  return { ok: true, recommended: true };
}

export type UpdatePostFormValues = { title: string; body: string };

export async function updateSharedBoardPostAction(
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

  const post = await getSharedBoardPostById(postId);
  if (!post) return { ok: false, error: "글을 찾을 수 없습니다." };

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";

  if (!title)
    return { ok: false, error: "제목을 입력해 주세요.", values: { title, body } };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values: { title, body },
    };
  }
  if (!body)
    return { ok: false, error: "내용을 입력해 주세요.", values: { title, body } };
  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `내용은 ${BODY_MAX_LENGTH}자 이하여야 합니다.`,
      values: { title, body },
    };
  }

  const isAuthor = post.authorUserId === session.user.id;
  const admin = isAdmin(session);

  if (admin) {
    const result = await updateSharedBoardPostByAdmin(postId, {
      title,
      body,
      updatedByUserId: session.user.id,
    });
    if (!result.ok)
      return { ok: false, error: result.error, values: { title, body } };
  } else if (isAuthor) {
    const result = await updateSharedBoardPost(postId, session.user.id, {
      title,
      body,
    });
    if (!result.ok)
      return { ok: false, error: result.error, values: { title, body } };
  } else {
    return { ok: false, error: "수정 권한이 없습니다.", values: { title, body } };
  }

  revalidatePath(`/board/${post.boardSlug}`);
  revalidatePath(`/board/${post.boardSlug}/${postId}`);
  redirect(`/board/${post.boardSlug}/${postId}`);
}

export async function deleteSharedBoardPostAction(
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const post = await getSharedBoardPostById(postId);
  if (!post) return { ok: false, error: "글을 찾을 수 없습니다." };

  const isAuthor = post.authorUserId === session.user.id;
  const admin = isAdmin(session);

  if (admin) {
    const result = await deleteSharedBoardPostByAdmin(postId);
    if (!result.ok) return result;
  } else if (isAuthor) {
    const result = await deleteSharedBoardPost(postId, session.user.id);
    if (!result.ok) return result;
  } else {
    return { ok: false, error: "삭제 권한이 없습니다." };
  }

  revalidatePath(`/board/${post.boardSlug}`);
  redirect(`/board/${post.boardSlug}`);
}

export async function deleteSharedBoardPostFormAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  return deleteSharedBoardPostAction(postId);
}

export async function createSharedBoardCommentAction(
  postId: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const post = await getSharedBoardPostById(postId);
  if (!post) return { ok: false, error: "글을 찾을 수 없습니다." };
  if (!COMMENT_RECOMMEND_BOARD_SLUGS.includes(post.boardSlug as (typeof COMMENT_RECOMMEND_BOARD_SLUGS)[number])) {
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
    const parent = await getSharedBoardCommentById(parentId);
    if (!parent)
      return { ok: false, error: "답글 대상 댓글을 찾을 수 없습니다." };
    if (parent.postId !== postId)
      return { ok: false, error: "잘못된 요청입니다." };
    if (parent.parentId !== null) {
      return { ok: false, error: "답글에는 답글을 달 수 없습니다." };
    }
  }

  const result = await createSharedBoardComment(
    postId,
    session.user.id,
    body,
    parentId ?? undefined,
  );
  if (!result.ok) return result;

  revalidatePath(`/board/${post.boardSlug}/${postId}`);
  return { ok: true };
}

export async function updateSharedBoardCommentAction(
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

  const result = await updateSharedBoardComment(
    commentId,
    session.user.id,
    body,
  );
  if (!result.ok) return result;

  const comment = await getSharedBoardCommentById(commentId);
  if (comment) {
    const post = await getSharedBoardPostById(comment.postId);
    if (post) {
      revalidatePath(`/board/${post.boardSlug}/${comment.postId}`);
    }
  }
  return { ok: true };
}

export async function deleteSharedBoardCommentAction(
  commentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const comment = await getSharedBoardCommentById(commentId);
  const result = await deleteSharedBoardComment(commentId, session.user.id);
  if (!result.ok) return result;

  if (comment) {
    const post = await getSharedBoardPostById(comment.postId);
    if (post) {
      revalidatePath(`/board/${post.boardSlug}/${comment.postId}`);
    }
  }
  return { ok: true };
}

/** "YYYY-MM-DDTHH:mm" 또는 빈 문자열 → Date | null */
function parseScheduledPublishAt(
  value: FormDataEntryValue | null,
): Date | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return null;
  const date = new Date(s);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type AdminNoticeFormValues = {
  title: string;
  body: string;
  isPublished: boolean;
  scheduledPublishAt: string;
};

/** 관리자 전용: 공용 공지사항 게시판에 글 작성 */
export async function createSharedBoardNoticePostAction(
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: AdminNoticeFormValues }
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
  const isPublished =
    isPublishedRaw !== "false" && isPublishedRaw !== "0";
  const scheduledPublishAt = parseScheduledPublishAt(
    formData.get("scheduledPublishAt"),
  );
  const noticeValues: AdminNoticeFormValues = {
    title,
    body,
    isPublished,
    scheduledPublishAt:
      (formData.get("scheduledPublishAt") as string)?.trim() ?? "",
  };

  if (!title)
    return { ok: false, error: "제목을 입력해 주세요.", values: noticeValues };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values: noticeValues,
    };
  }
  if (!body)
    return { ok: false, error: "내용을 입력해 주세요.", values: noticeValues };
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
      return {
        ok: false,
        error: "대표 이미지는 JPEG, PNG, WebP만 가능합니다.",
        values: noticeValues,
      };
    }
    if (coverFile.size > MAX_BOARD_IMAGE_SIZE) {
      return {
        ok: false,
        error: "대표 이미지는 10MB 이하여야 합니다.",
        values: noticeValues,
      };
    }
    try {
      const arrayBuffer = await coverFile.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      const ext =
        type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
      const { buffer: outputBuffer } = await processBoardImage(
        inputBuffer,
        ext,
      );
      const key = `uploads/board/shared/notice/${session.user.id}/${randomUUID()}.jpg`;
      coverImageUrl = await uploadBufferToS3(
        key,
        outputBuffer,
        "image/jpeg",
      );
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error ? e.message : "대표 이미지 업로드에 실패했습니다.",
        values: noticeValues,
      };
    }
  }

  const board = await getSharedBoardBySlug(NOTICE_BOARD_SLUG);
  if (!board) {
    return {
      ok: false,
      error: "공지사항 게시판을 찾을 수 없습니다.",
      values: noticeValues,
    };
  }

  const result = await createSharedBoardPost(
    board.id,
    session.user.id,
    title,
    body,
    coverImageUrl,
    isPublished,
    scheduledPublishAt,
  );
  if (!result.ok)
    return { ok: false, error: result.error, values: noticeValues };

  revalidatePath("/board/notice");
  revalidatePath("/admin/notice/rigger");
  redirect("/admin/notice/rigger");
}

/** 관리자 전용: 공용 공지 수정 */
export async function updateSharedBoardNoticePostAction(
  postId: string,
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; error: string; values?: AdminNoticeFormValues }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 공지를 수정할 수 있습니다." };
  }

  const post = await getSharedBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (post.boardSlug !== NOTICE_BOARD_SLUG) {
    return { ok: false, error: "공지사항 글만 수정할 수 있습니다." };
  }

  const title = (formData.get("title") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim() ?? "";
  const isPublishedRaw = formData.get("isPublished");
  const isPublished =
    isPublishedRaw !== "false" && isPublishedRaw !== "0";
  const scheduledPublishAt = parseScheduledPublishAt(
    formData.get("scheduledPublishAt"),
  );
  const noticeValues: AdminNoticeFormValues = {
    title,
    body,
    isPublished,
    scheduledPublishAt:
      (formData.get("scheduledPublishAt") as string)?.trim() ?? "",
  };

  if (!title)
    return { ok: false, error: "제목을 입력해 주세요.", values: noticeValues };
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`,
      values: noticeValues,
    };
  }
  if (!body)
    return { ok: false, error: "내용을 입력해 주세요.", values: noticeValues };
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
      return {
        ok: false,
        error: "대표 이미지는 JPEG, PNG, WebP만 가능합니다.",
        values: noticeValues,
      };
    }
    if (coverFile.size > MAX_BOARD_IMAGE_SIZE) {
      return {
        ok: false,
        error: "대표 이미지는 10MB 이하여야 합니다.",
        values: noticeValues,
      };
    }
    try {
      const arrayBuffer = await coverFile.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      const ext =
        type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
      const { buffer: outputBuffer } = await processBoardImage(
        inputBuffer,
        ext,
      );
      const key = `uploads/board/shared/notice/${session.user.id}/${randomUUID()}.jpg`;
      coverImageUrl = await uploadBufferToS3(
        key,
        outputBuffer,
        "image/jpeg",
      );
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error ? e.message : "대표 이미지 업로드에 실패했습니다.",
        values: noticeValues,
      };
    }
  }

  const result = await updateSharedBoardPostByAdmin(postId, {
    title,
    body,
    coverImageUrl,
    isPublished,
    scheduledPublishAt,
    updatedByUserId: session.user.id,
  });
  if (!result.ok)
    return { ok: false, error: result.error, values: noticeValues };

  revalidatePath("/board/notice");
  revalidatePath("/admin/notice/rigger");
  revalidatePath(`/admin/notice/rigger/${postId}/edit`);
  redirect("/admin/notice/rigger");
}

/** 관리자 전용: 공용 공지 삭제 */
export async function deleteSharedBoardNoticePostAction(
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 공지를 삭제할 수 있습니다." };
  }

  const post = await getSharedBoardPostById(postId);
  if (!post) {
    return { ok: false, error: "글을 찾을 수 없습니다." };
  }
  if (post.boardSlug !== NOTICE_BOARD_SLUG) {
    return { ok: false, error: "공지사항 글만 삭제할 수 있습니다." };
  }

  const result = await deleteSharedBoardPostByAdmin(postId);
  if (!result.ok) return result;

  revalidatePath("/board/notice");
  revalidatePath("/admin/notice/rigger");
  redirect("/admin/notice/rigger");
}

/** 관리자 전용: 공용 공지 삭제 (폼에서 postId 전달용) */
export async function deleteSharedBoardNoticePostFormAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  return deleteSharedBoardNoticePostAction(postId);
}
