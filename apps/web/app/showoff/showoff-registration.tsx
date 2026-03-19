"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { resizeImageOnClient } from "@/lib/image/resize-client";
import {
  submitMonthlyHotpickAction,
  replaceMonthlyHotpickAction,
  deleteMonthlyHotpickAction,
} from "./actions";

/** 등급 카드와 동일한 노출 크기(280px, 3:4) — 미리보기/등록 폼용 */
const CARD_PREVIEW_CLASS =
  "relative flex w-full max-w-[280px] flex-col overflow-hidden rounded-xl border-2 border-border bg-muted/30 aspect-[3/4] min-h-[190px] sm:min-h-[210px]";

export function ShowoffRegistration({
  monthKey,
  mySubmission,
}: {
  monthKey: string;
  mySubmission: { id: string; imageUrl: string } | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showReplaceForm, setShowReplaceForm] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      if (!file) return null;
      return URL.createObjectURL(file);
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("image") as File | null;
    if (!file || !(file.size > 0)) {
      setError("사진을 선택해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const MAX = 4 * 1024 * 1024;
      if (file.size > MAX) {
        const resized = await resizeImageOnClient(file);
        formData.set("image", resized);
      }
      const result = await submitMonthlyHotpickAction(monthKey, formData);
      if (result.ok) {
        form.reset();
        if (inputRef.current) inputRef.current.value = "";
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReplaceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mySubmission) return;
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("image") as File | null;
    if (!file || !(file.size > 0)) {
      setError("사진을 선택해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await replaceMonthlyHotpickAction(
        monthKey,
        mySubmission.id,
        formData,
      );
      if (result.ok) {
        form.reset();
        if (inputRef.current) inputRef.current.value = "";
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setShowReplaceForm(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!mySubmission) return;
    if (!confirm("참가를 취소하시겠습니까?")) return;
    setError(null);
    setDeleting(true);
    try {
      const result = await deleteMonthlyHotpickAction(monthKey, mySubmission.id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  const isRegisteredOnly = mySubmission && !showReplaceForm;
  const cardImageUrl =
    isRegisteredOnly
      ? mySubmission.imageUrl
      : previewUrl;

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (mySubmission && showReplaceForm) {
      handleReplaceSubmit(e);
    } else {
      handleSubmit(e);
    }
  }

  return (
    <section className="flex w-[280px] max-w-full flex-col gap-3 flex-shrink-0">
      {isRegisteredOnly ? (
        <>
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full"
          >
            등록완료
          </Button>
          <div
            className={CARD_PREVIEW_CLASS}
            aria-label="등록된 사진"
          >
            <img
              src={mySubmission.imageUrl}
              alt="등록한 사진"
              className="h-full w-full object-cover object-center"
            />
          </div>
          <div className="flex w-full gap-2">
            <Button
              type="button"
              onClick={() => setShowReplaceForm(true)}
              variant="outline"
              className="flex-1"
            >
              사진 변경
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 text-muted-foreground"
            >
              {deleting ? "취소 중…" : "참가 취소"}
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={handleFormSubmit}
          className="flex flex-col gap-3"
        >
          <input
            ref={inputRef}
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="sr-only"
            aria-hidden
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="w-full"
          >
            파일 선택
          </Button>
          <div
            className={CARD_PREVIEW_CLASS}
            aria-label={cardImageUrl ? "선택한 사진" : "등록할 사진"}
          >
            {cardImageUrl ? (
              <img
                src={cardImageUrl}
                alt="선택한 사진"
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
                <span className="text-4xl opacity-50" aria-hidden>
                  🖼️
                </span>
                <span className="text-sm text-muted-foreground">
                  사진을 선택해 주세요
                </span>
              </div>
            )}
          </div>
          {mySubmission && showReplaceForm ? (
            <div className="flex w-full gap-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? "변경 중…" : "변경 적용"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowReplaceForm(false);
                    setError(null);
                    setPreviewUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return null;
                    });
                  }}
                >
                  취소
                </Button>
              </div>
          ) : (
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "등록 중…" : "사진 등록"}
            </Button>
          )}
        </form>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
