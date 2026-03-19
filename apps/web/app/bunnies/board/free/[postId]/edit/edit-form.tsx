"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { resizeImageOnClient } from "@/lib/image/resize-client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  updateBunnyBoardPostAction,
  uploadBoardImageAction,
  type UpdatePostFormValues,
} from "@/app/bunnies/board/actions";
import {
  bodyToEditableHtml,
  serializeEditableToBody,
  countImagesInEditable,
  insertImageIntoEditable,
} from "@/app/bunnies/board/utils/body-editable";
import { ImagePlus } from "lucide-react";

const TITLE_MAX = 200;
const BODY_MAX = 10_000;

export function BunnyBoardPostEditForm({
  postId,
  initialValues,
}: {
  postId: string;
  initialValues: UpdatePostFormValues;
}) {
  type UpdateState =
    | { ok: true }
    | { ok: false; error: string; values?: UpdatePostFormValues }
    | null;
  const [state, formAction] = useActionState(
    (prev: UpdateState, formData: FormData) =>
      updateBunnyBoardPostAction(postId, prev, formData),
    null as UpdateState,
  );

  const values =
    state?.ok === false && state?.values ? state.values : initialValues;
  const [title, setTitle] = useState(initialValues.title);
  const [formKey, setFormKey] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok === false && state?.values) {
      setFormKey((k) => k + 1);
    }
  }, [state?.ok, state?.ok === false ? state.values : undefined]);

  useEffect(() => {
    if (editableRef.current) {
      editableRef.current.innerHTML = bodyToEditableHtml(values.body);
      setImageCount(countImagesInEditable(editableRef.current));
    }
  }, [formKey, values.body]);

  useEffect(() => {
    setTitle(values.title);
  }, [values.title]);

  const canAddImage = imageCount < 3;

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
      const MAX = 4 * 1024 * 1024;
      const finalFile = file.size > MAX ? await resizeImageOnClient(file) : file;
      const fd = new FormData();
      fd.set("file", finalFile);
      fd.set("body", serializeEditableToBody(editableRef.current));
      const result = await uploadBoardImageAction(fd);
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

  function handleReset() {
    setTitle(initialValues.title);
    setFormKey((k) => k + 1);
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      onReset={handleReset}
      onSubmit={handleFormSubmit}
      suppressHydrationWarning
    >
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
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
          최대 {BODY_MAX}자 · 이미지 {imageCount}/3장
        </p>
      </div>
      {state?.ok === false && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="min-h-[44px]">
          수정
        </Button>
        <Button type="reset" variant="outline" className="min-h-[44px]">
          초기화
        </Button>
      </div>
    </form>
  );
}
