"use client";

import { useActionState, useState, useCallback, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  createBunnyBoardNoticePostAction,
  updateBunnyBoardNoticePostAction,
  deleteBunnyBoardNoticePostFormAction,
  type CreatePostFormValues,
} from "@/app/bunnies/board/actions";
import { ScheduledDateTimePicker } from "@/components/scheduled-datetime-picker";

const TITLE_MAX = 200;
const BODY_MAX = 10_000;

type NoticePostFormProps = {
  postId?: string;
  initialValues?: {
    title: string;
    body: string;
    coverImageUrl?: string | null;
    isPublished?: boolean;
    /** 예약 공개 시각 (datetime-local 값: "YYYY-MM-DDTHH:mm") */
    scheduledPublishAt?: string | null;
  };
};

export function AdminNoticePostForm({
  postId,
  initialValues,
}: NoticePostFormProps = {}) {
  const isEdit = !!postId;

  const [createState, createFormAction] = useActionState(
    createBunnyBoardNoticePostAction,
    null as {
      ok: false;
      error: string;
      values?: CreatePostFormValues;
    } | null,
  );

  const boundUpdateAction = useCallback(
    (prev: unknown, formData: FormData) =>
      postId
        ? updateBunnyBoardNoticePostAction(postId, prev, formData)
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
    deleteBunnyBoardNoticePostFormAction,
    null as { ok: true } | { ok: false; error: string } | null,
  );

  const state = isEdit ? updateState : createState;
  const formAction = isEdit ? updateFormAction : createFormAction;

  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialValues?.coverImageUrl ?? null,
  );

  const baseValues = initialValues ?? { title: "", body: "" };
  const values =
    state?.ok === false && state?.values
      ? { ...baseValues, ...state.values }
      : baseValues;
  const [titleLength, setTitleLength] = useState((values.title ?? "").length);
  useEffect(() => {
    setTitleLength((values.title ?? "").length);
  }, [values.title]);
  const isPublishedDefault =
    values.isPublished !== false ? "true" : "false";

  const [scheduledValue, setScheduledValue] = useState(
    () => initialValues?.scheduledPublishAt ?? "",
  );
  useEffect(() => {
    if (state?.ok === false && state?.values) {
      setScheduledValue(state.values.scheduledPublishAt ?? "");
    }
  }, [state?.ok, state?.values?.scheduledPublishAt]);

  return (
    <div className="flex flex-col gap-4">
      <form
        action={formAction}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          if (
            (e.nativeEvent as SubmitEvent).submitter?.getAttribute("data-intent") === "delete" &&
            !confirm("이 공지를 삭제하시겠습니까?")
          ) {
            e.preventDefault();
          }
        }}
      >
        <section className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* 좌측: 대표 이미지 (1장) */}
          <div className="space-y-3">
            <h3 className="font-medium">대표 이미지</h3>
            <input
              id="admin-notice-cover"
              type="file"
              name="coverImage"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="대표 이미지 선택"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setCoverPreview(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
            <label
              htmlFor="admin-notice-cover"
              className="relative flex aspect-square w-full max-w-sm cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/30 md:max-w-none min-h-[200px]"
            >
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <span className="text-sm">파일 선택</span>
                  <span className="text-xs">
                    이미지를 선택하세요 (선택 사항)
                  </span>
                </div>
              )}
            </label>
          </div>

          {/* 우측: 공개 유무 · 제목 · 내용 (클래스 등록 화면과 동일한 그리드) */}
          <div className="flex flex-col gap-3">
            <h3 className="font-medium">
              {isEdit ? "내용 수정" : "내용 작성"}
            </h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center">
              <Label htmlFor="admin-notice-visibility" className="min-w-[7rem]">
                공개유무 <span className="text-red-600">*</span>
              </Label>
              <div
                id="admin-notice-visibility"
                className="inline-flex w-full max-w-xs rounded-md border border-border bg-muted/30 p-px sm:max-w-[12rem]"
                role="radiogroup"
                aria-label="공개 유무"
              >
                <label className="flex min-h-[32px] flex-1 cursor-pointer items-center justify-center rounded py-1 text-sm font-medium transition-colors has-[:checked]:bg-background has-[:checked]:shadow-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <input
                    type="radio"
                    name="isPublished"
                    value="true"
                    defaultChecked={isPublishedDefault === "true"}
                    className="sr-only"
                  />
                  공개
                </label>
                <label className="flex min-h-[32px] flex-1 cursor-pointer items-center justify-center rounded py-1 text-sm font-medium transition-colors has-[:checked]:bg-background has-[:checked]:shadow-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
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
              <Label htmlFor="admin-notice-scheduled" className="min-w-[7rem]">
                예약 공개 시각
              </Label>
              <div className="min-w-0">
                <ScheduledDateTimePicker
                  id="admin-notice-scheduled"
                  name="scheduledPublishAt"
                  value={scheduledValue}
                  onChange={setScheduledValue}
                  aria-label="예약 공개 시각 (비워두면 즉시 공개)"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  비워두면 즉시 공개. 공개로 선택한 경우에만 적용됩니다.
                </p>
              </div>
              <Label htmlFor="admin-notice-title" className="min-w-[7rem]">
                제목 <span className="text-red-600">*</span>
              </Label>
              <div className="relative min-w-0">
                <Input
                  id="admin-notice-title"
                  name="title"
                  required
                  maxLength={TITLE_MAX}
                  placeholder="제목을 입력하세요"
                  defaultValue={values.title}
                  className="min-h-[44px] pr-14"
                  onChange={(e) => setTitleLength(e.target.value.length)}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {titleLength}/{TITLE_MAX}
                </span>
              </div>
            </div>
            <div className="space-y-2 flex-1 min-h-0">
              <Label htmlFor="admin-notice-body">내용</Label>
              <Textarea
                id="admin-notice-body"
                name="body"
                required
                maxLength={BODY_MAX}
                placeholder="내용을 입력하세요 (마크다운 가능)"
                defaultValue={values.body}
                rows={12}
                className="min-h-[200px] resize-y"
              />
              <p className="text-xs text-muted-foreground">
                최대 {BODY_MAX}자
              </p>
            </div>
          </div>
        </section>

        {state?.ok === false && state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {isEdit && (
          <input type="hidden" name="postId" value={postId} />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" className="min-h-[44px]">
            {isEdit ? "저장" : "공지 등록"}
          </Button>
          {isEdit && (
            <Button
              type="submit"
              formAction={deleteFormAction}
              variant="destructive"
              className="min-h-[44px]"
              data-intent="delete"
            >
              삭제
            </Button>
          )}
        </div>
        {deleteState?.ok === false && deleteState.error && (
          <p className="text-sm text-destructive">{deleteState.error}</p>
        )}
      </form>
    </div>
  );
}
