"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BunnyCard } from "@/components/bunny-card";
import { Button } from "@workspace/ui/components/button";
import { uploadBunnyCardImage } from "@/app/profile/edit/bunny-card-upload-actions";

type OwnBunnyCardColumnProps = {
  profileId: string;
  cardImageUrl: string | null;
};

export function OwnBunnyCardColumn({
  profileId,
  cardImageUrl: initialCardImageUrl,
}: OwnBunnyCardColumnProps) {
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
      const result = await uploadBunnyCardImage(profileId, fd);
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
    <div className="flex w-full max-w-[280px] flex-col gap-1 sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:justify-end">
      <div className="w-full">
        <BunnyCard cardImageUrl={displayCardUrl} />
      </div>
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
    </div>
  );
}
