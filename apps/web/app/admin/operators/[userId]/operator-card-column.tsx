"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { uploadOperatorCardImage } from "./operator-card-upload-actions";

type OperatorCardColumnProps = {
  userId: string;
  cardImageUrl: string | null;
  displayName: string;
  showPendingBadge: boolean;
  canEdit: boolean;
};

export function OperatorCardColumn({
  userId,
  cardImageUrl: initialCardImageUrl,
  displayName,
  showPendingBadge,
  canEdit,
}: OperatorCardColumnProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialUrl = initialCardImageUrl?.trim() || "";
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState(initialUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pendingFile !== null) return;
    setPendingUrl((prev) => (prev !== initialUrl ? initialUrl : prev));
  }, [initialUrl, pendingFile]);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const displayCardUrl = previewUrl ?? (pendingUrl || null);
  const dirty = pendingFile !== null;

  async function handleSave() {
    if (!pendingFile) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("image", pendingFile);
      const result = await uploadOperatorCardImage(userId, fd);
      if (result.ok) {
        setPendingFile(null);
        setPendingUrl(initialUrl);
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setPendingFile(null);
    setPendingUrl(initialUrl);
  }

  return (
    <div className="flex justify-start sm:col-start-1 sm:row-start-1">
      <div className="flex w-full max-w-[280px] flex-col gap-1">
        <div
          className="relative flex w-full min-w-0 max-w-[280px] flex-col overflow-hidden rounded-xl border-2 border-border bg-muted/30 aspect-[3/4] min-h-[190px] sm:min-h-[210px]"
          aria-label="운영진 카드"
        >
          {displayCardUrl ? (
            <img
              src={displayCardUrl}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserCircle className="size-12 text-muted-foreground" />
              </div>
              <p className="w-full min-w-0 truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              {showPendingBadge && (
                <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  승인대기
                </span>
              )}
            </div>
          )}
        </div>
        {canEdit && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPendingFile(file);
                e.target.value = "";
              }}
            />
            {dirty ? (
              <div className="grid w-full grid-cols-3 gap-1">
                <Button
                  type="button"
                  className="col-span-2 bg-blue-600 font-medium text-white hover:bg-blue-700"
                  size="sm"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? "저장 중…" : "저장"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="col-span-1"
                  disabled={saving}
                  onClick={handleCancel}
                >
                  취소
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => inputRef.current?.click()}
              >
                이미지 수정
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
