"use client";

import { useActionState, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  createAdminSharedBoardQnaPostAction,
  updateAdminSharedBoardQnaPostAction,
  deleteAdminSharedBoardQnaPostFormAction,
  uploadSharedBoardImageAction,
  type CreatePostFormValues,
} from "@/app/board/actions";
import {
  bodyToEditableHtml,
  serializeEditableToBody,
  countImagesInEditable,
  insertImageIntoEditable,
} from "@/app/bunnies/board/utils/body-editable";
import Link from "next/link";
import { ImagePlus } from "lucide-react";

const TITLE_MAX = 200;
const BODY_MAX = 10_000;
const MAX_IMAGES = 3;

type AdminQnaPostFormProps = {
  postId?: string;
  initialValues?: {
    title: string;
    body: string;
    isPublished?: boolean;
    sortOrder?: number;
  };
};

export function AdminQnaPostForm({
  postId,
  initialValues: initialValuesProp,
}: AdminQnaPostFormProps = {}) {
  const isEdit = !!postId;
  const initialValues = initialValuesProp ?? {
    title: "",
    body: "",
    isPublished: true,
    sortOrder: 0,
  };

  const [createState, createFormAction] = useActionState(
    createAdminSharedBoardQnaPostAction,
    null as {
      ok: false;
      error: string;
      values?: CreatePostFormValues;
    } | null,
  );

  const boundUpdateAction = useCallback(
    (prev: unknown, formData: FormData) =>
      postId
        ? updateAdminSharedBoardQnaPostAction(postId, prev, formData)
        : Promise.resolve(prev),
    [postId],
  );

  const [updateState, updateFormAction] = useActionState(
    boundUpdateAction,
    null as {
      ok: false;
      error: string;
      values?: CreatePostFormValues;
    } | null,
  );

  const [deleteState, deleteFormAction] = useActionState(
    deleteAdminSharedBoardQnaPostFormAction,
    null as { ok: true } | { ok: false; error: string } | null,
  );

  const state = isEdit ? updateState : createState;
  const formAction = isEdit ? updateFormAction : createFormAction;

  const values =
    state?.ok === false && state?.values ? state.values : initialValues;
  const isPublishedDefault =
    values.isPublished !== false ? "true" : "false";
  const [title, setTitle] = useState(initialValues.title);
  const [sortOrder, setSortOrder] = useState(
    initialValues.sortOrder ?? 0,
  );
  const [formKey, setFormKey] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddImage = imageCount < MAX_IMAGES;

  useEffect(() => {
    if (state?.ok === false && state?.values) {
      setTitle(state.values.title);
      setSortOrder(state.values.sortOrder ?? 0);
      setFormKey((k) => k + 1);
    }
  }, [state?.ok, state?.values]);

  useEffect(() => {
    if (editableRef.current) {
      editableRef.current.innerHTML = bodyToEditableHtml(values.body);
      setImageCount(countImagesInEditable(editableRef.current));
    }
  }, [formKey, values.body]);

  function handleEditableClick(e: React.MouseEvent<HTMLDivElement>) {
    const wrap = (e.target as HTMLElement).closest(".board-img-delete");
    if (wrap) {
      const container = (e.target as HTMLElement).closest(".board-img-wrap");
      container?.remove();
      setImageCount(countImagesInEditable(editableRef.current));
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const bodyInput = form.querySelector('input[name="body"]');
    if (bodyInput instanceof HTMLInputElement && editableRef.current) {
      bodyInput.value = serializeEditableToBody(editableRef.current);
    }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!canAddImage) return;
    if (!editableRef.current) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("body", serializeEditableToBody(editableRef.current));
      const result = await uploadSharedBoardImageAction(fd);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      insertImageIntoEditable(editableRef.current, result.url);
      setImageCount(countImagesInEditable(editableRef.current));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        action={formAction}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          if (
            (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
              "data-intent",
            ) === "delete" &&
            !confirm("이 글을 삭제하시겠습니까?")
          ) {
            e.preventDefault();
          } else {
            handleFormSubmit(e);
          }
        }}
        suppressHydrationWarning
      >
        <div key={formKey} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Label
              htmlFor="admin-qna-visibility"
              className="shrink-0"
            >
              공개 유무 <span className="text-red-600">*</span>
            </Label>
            <div
              id="admin-qna-visibility"
              className="inline-flex rounded-md border border-border bg-muted/30 p-px"
              role="radiogroup"
              aria-label="공개 유무"
            >
              <label className="flex min-h-[44px] min-w-[4rem] cursor-pointer items-center justify-center rounded px-3 py-1 text-sm font-medium transition-colors has-[:checked]:bg-background has-[:checked]:shadow-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <input
                  type="radio"
                  name="isPublished"
                  value="true"
                  defaultChecked={isPublishedDefault === "true"}
                  className="sr-only"
                />
                공개
              </label>
              <label className="flex min-h-[44px] min-w-[4rem] cursor-pointer items-center justify-center rounded px-3 py-1 text-sm font-medium transition-colors has-[:checked]:bg-background has-[:checked]:shadow-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <input
                  type="radio"
                  name="isPublished"
                  value="false"
                  defaultChecked={isPublishedDefault === "false"}
                  className="sr-only"
                />
                비공개
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="admin-qna-sortOrder" className="shrink-0">
              게시물 정리 순서
            </Label>
            <Input
              id="admin-qna-sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={sortOrder}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") setSortOrder(0);
                else {
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n) && n >= 0) setSortOrder(n);
                }
              }}
              className="min-h-[44px] w-24"
              suppressHydrationWarning
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-qna-title">제목</Label>
          <Input
            id="admin-qna-title"
            name="title"
            required
            maxLength={TITLE_MAX}
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-[44px]"
            suppressHydrationWarning
          />
          <p className="text-xs text-muted-foreground">최대 {TITLE_MAX}자</p>
        </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="body">내용</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[44px] shrink-0"
            disabled={uploading || !canAddImage}
            onClick={() => canAddImage && fileInputRef.current?.click()}
          >
            <ImagePlus className="size-5 sm:mr-1" />
            <span className="hidden sm:inline">이미지 삽입</span>
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-hidden
          onChange={handleImageSelect}
          suppressHydrationWarning
        />
        <input type="hidden" name="body" value="" />
        <div
          ref={editableRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          suppressContentEditableWarning
          data-placeholder="내용을 입력하세요"
          className="min-h-[200px] rounded-lg border border-input bg-background px-3 py-2 text-[15px] leading-[1.6] outline-none [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-muted-foreground"
          style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
          onClick={handleEditableClick}
        />
        <p className="text-xs text-muted-foreground">
          최대 {BODY_MAX}자 · 이미지 {imageCount}/{MAX_IMAGES}장
        </p>
      </div>
        {state?.ok === false && state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {isEdit && (
          <input type="hidden" name="postId" value={postId} />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" className="min-h-[44px]">
            {isEdit ? "저장" : "등록"}
          </Button>
          {isEdit && (
            <>
              <Button
                type="submit"
                formAction={deleteFormAction}
                variant="destructive"
                className="min-h-[44px]"
                data-intent="delete"
              >
                삭제
              </Button>
              <Button asChild variant="outline" className="min-h-[44px]">
                <Link href="/admin/notice/qna">취소</Link>
              </Button>
            </>
          )}
        </div>
        {deleteState?.ok === false && deleteState.error && (
          <p className="text-sm text-destructive">{deleteState.error}</p>
        )}
      </form>
    </div>
  );
}
